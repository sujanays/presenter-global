import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { createPairingToken, verifyPairingToken } from '../services/pairingService.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const registerDevice = async (req: Request, res: Response) => {
  const { deviceUid, deviceName, deviceType, osName, osVersion } = req.body;

  if (!deviceUid || !deviceName || !deviceType) {
    return res.status(400).json({ error: 'deviceUid, deviceName, and deviceType are required parameters' });
  }

  try {
    // Attempt database insert
    const insertQuery = `
      INSERT INTO devices (device_uid, device_name, device_type, os_name, os_version)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (device_uid) DO UPDATE
      SET device_name = $2, os_name = $4, os_version = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const dbRes = await query(insertQuery, [deviceUid, deviceName, deviceType, osName, osVersion]);
    
    return res.status(201).json({
      message: 'Device registered successfully',
      device: dbRes.rows[0]
    });
  } catch (error) {
    console.warn('PostgreSQL offline. Running registration in offline/fallback mode.');
    // Offline Mock fallback response
    return res.status(201).json({
      message: 'Device registered in offline fallback mode',
      device: {
        id: 'fallback_' + Math.random().toString(36).substring(2, 9),
        device_uid: deviceUid,
        device_name: deviceName,
        device_type: deviceType,
        os_name: osName,
        os_version: osVersion
      }
    });
  }
};

export const requestPairToken = async (req: Request, res: Response) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  try {
    const pairToken = await createPairingToken(deviceId);
    return res.status(200).json({
      deviceId,
      temporaryPairToken: pairToken,
      expiresIn: env.PAIR_TOKEN_EXPIRY_MS / 1000
    });
  } catch (error) {
    console.error('Pairing token request error:', error);
    return res.status(500).json({ error: 'Failed to generate pairing token' });
  }
};

export const verifyPairToken = async (req: Request, res: Response) => {
  const { token, mobileDeviceId } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const desktopDeviceId = await verifyPairingToken(token);

    if (!desktopDeviceId) {
      return res.status(400).json({ error: 'Pairing token has expired or is invalid' });
    }

    // Generate JWT access tokens for the session
    const accessToken = jwt.sign(
      { deviceId: mobileDeviceId, role: 'mobile', pairedWith: desktopDeviceId },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { deviceId: mobileDeviceId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    try {
      // Record trusted device relationship in Postgres if active
      const registerPairSql = `
        INSERT INTO trusted_pairs (desktop_device_id, mobile_device_id, auth_secret)
        VALUES ((SELECT id FROM devices WHERE device_uid = $1 LIMIT 1), 
                (SELECT id FROM devices WHERE device_uid = $2 LIMIT 1), 
                $3)
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;
      await query(registerPairSql, [desktopDeviceId, mobileDeviceId, 'signature_secret_placeholder']);
    } catch (e) {
      // Gracefully ignore if postgres offline
    }

    return res.status(200).json({
      message: 'Pairing successful',
      accessToken,
      refreshToken,
      deviceId: desktopDeviceId
    });
  } catch (error) {
    console.error('Pairing verification error:', error);
    return res.status(500).json({ error: 'Failed to complete pairing verification' });
  }
};

export const listTrustedPairs = async (req: Request, res: Response) => {
  try {
    const dbRes = await query(`
      SELECT tp.*, d.device_name as desktop_name, d.os_name, d.os_version
      FROM trusted_pairs tp
      JOIN devices d ON tp.desktop_device_id = d.id
      ORDER BY tp.last_used_at DESC;
    `);
    return res.status(200).json({ pairs: dbRes.rows });
  } catch (e) {
    return res.status(200).json({ pairs: [] }); // Empty fallback
  }
};

export const revokePair = async (req: Request, res: Response) => {
  const { pairId } = req.params;

  try {
    await query('DELETE FROM trusted_pairs WHERE id = $1', [pairId]);
    return res.status(200).json({ message: 'Trusted pairing revoked successfully' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to revoke trusted pairing' });
  }
};
