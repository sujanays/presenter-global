import { exec } from 'child_process';

// Interface defining the keyboard/mouse injector operations
export interface IInputInjector {
  injectKey(keyName: 'left' | 'right' | 'f5' | 'escape' | 'b' | 'f11'): void;
  moveMouse(x: number, y: number): void;
  moveMouseRelative(dx: number, dy: number): void;
  mouseClick(button: 'left' | 'right'): void;
}

let robot: any = null;
try {
  robot = require('robotjs');
  console.log('RobotJS loaded successfully in Desktop Agent.');
} catch (error) {
  console.warn('RobotJS native module failed to load. Using Windows PowerShell fallback injector.', error);
}

class RobotJSInjector implements IInputInjector {
  injectKey(keyName: 'left' | 'right' | 'f5' | 'escape' | 'b' | 'f11'): void {
    try {
      const robotKeyMap: Record<string, string> = {
        left: 'left',
        right: 'right',
        f5: 'f5',
        escape: 'escape',
        b: 'b',
        f11: 'f11',
      };
      const key = robotKeyMap[keyName];
      if (key) {
        robot.keyTap(key);
        console.log(`[RobotJS] Tap key: ${key}`);
      }
    } catch (e) {
      console.error('[RobotJS] Key tap error:', e);
    }
  }

  moveMouse(x: number, y: number): void {
    try {
      robot.moveMouse(x, y);
    } catch (e) {
      console.error('[RobotJS] Mouse move error:', e);
    }
  }

  moveMouseRelative(dx: number, dy: number): void {
    try {
      const mouse = robot.getMousePos();
      robot.moveMouse(mouse.x + dx, mouse.y + dy);
    } catch (e) {
      console.error('[RobotJS] Mouse relative move error:', e);
    }
  }

  mouseClick(button: 'left' | 'right'): void {
    try {
      robot.mouseClick(button);
      console.log(`[RobotJS] Mouse click: ${button}`);
    } catch (e) {
      console.error('[RobotJS] Mouse click error:', e);
    }
  }
}

class PowerShellFallbackInjector implements IInputInjector {
  private executePS(command: string) {
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`;
    exec(psCommand, (error) => {
      if (error) {
        console.error('[PowerShell Fallback] Execution error:', error);
      }
    });
  }

  injectKey(keyName: 'left' | 'right' | 'f5' | 'escape' | 'b' | 'f11'): void {
    const psKeyMap: Record<string, string> = {
      left: '{LEFT}',
      right: '{RIGHT}',
      f5: '{F5}',
      escape: '{ESC}',
      b: 'b',
      f11: '{F11}',
    };
    const key = psKeyMap[keyName];
    if (key) {
      console.log(`[PowerShell Fallback] Tap key: ${key}`);
      this.executePS(`
        [void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
        [System.Windows.Forms.SendKeys]::SendWait('${key}');
      `);
    }
  }

  moveMouse(x: number, y: number): void {
    // Moves system cursor on primary monitor
    this.executePS(`
      [void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)});
    `);
  }

  moveMouseRelative(dx: number, dy: number): void {
    this.executePS(`
      [void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
      $p = [System.Windows.Forms.Cursor]::Position;
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($p.X + ${Math.round(dx)}), ($p.Y + ${Math.round(dy)}));
    `);
  }

  mouseClick(button: 'left' | 'right'): void {
    const clickFlag = button === 'left' ? '0x0002 -bor 0x0004' : '0x0008 -bor 0x0010';
    console.log(`[PowerShell Fallback] Click mouse: ${button}`);
    this.executePS(`
      $signature = '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int dwExtraInfo);';
      $type = Add-Type -MemberDefinition $signature -Name WinAPI -Namespace WinAPI -PassThru;
      $type::mouse_event(${clickFlag}, 0, 0, 0, 0);
    `);
  }
}

// Export singleton instance of input injector
export const inputInjector: IInputInjector = robot ? new RobotJSInjector() : new PowerShellFallbackInjector();
export default inputInjector;
