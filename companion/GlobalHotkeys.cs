using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace AlgoTimer.Companion;

internal sealed class GlobalHotkeys : NativeWindow, IDisposable
{
    private const int WmHotkey = 0x0312;
    private const uint ModAlt = 0x0001;
    private const uint ModControl = 0x0002;
    private const uint ModShift = 0x0004;
    private const uint ModWin = 0x0008;
    private const uint ModNoRepeat = 0x4000;
    private const int FirstHotkeyId = 0xA710;

    private readonly Dictionary<int, string> _commands = new();
    private int _nextId = FirstHotkeyId;

    public event Action<string>? CommandPressed;
    public event Action<string, string, string>? RegistrationFailed;

    public GlobalHotkeys()
    {
        CreateHandle(new CreateParams());
    }

    public Dictionary<string, bool> Register(IReadOnlyDictionary<string, string> bindings)
    {
        var result = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var (command, binding) in bindings)
        {
            try
            {
                var (modifiers, key) = Parse(binding);
                var id = _nextId++;
                if (!RegisterHotKey(Handle, id, modifiers | ModNoRepeat, (uint)key))
                    throw new Win32Exception(Marshal.GetLastWin32Error());

                _commands[id] = command;
                result[command] = true;
            }
            catch (Exception error)
            {
                result[command] = false;
                RegistrationFailed?.Invoke(command, binding, error.Message);
            }
        }
        return result;
    }

    protected override void WndProc(ref Message message)
    {
        if (message.Msg == WmHotkey && _commands.TryGetValue(message.WParam.ToInt32(), out var command))
            CommandPressed?.Invoke(command);
        base.WndProc(ref message);
    }

    public void Dispose()
    {
        foreach (var id in _commands.Keys) UnregisterHotKey(Handle, id);
        _commands.Clear();
        DestroyHandle();
    }

    private static (uint Modifiers, Keys Key) Parse(string binding)
    {
        var parts = binding.Split('+', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        uint modifiers = 0;
        Keys key = Keys.None;
        foreach (var part in parts)
        {
            switch (part.ToLowerInvariant())
            {
                case "ctrl":
                case "control": modifiers |= ModControl; break;
                case "alt": modifiers |= ModAlt; break;
                case "shift": modifiers |= ModShift; break;
                case "win":
                case "windows": modifiers |= ModWin; break;
                default:
                    if (part.Length == 1 && part[0] is >= '0' and <= '9')
                        key = (Keys)((int)Keys.D0 + part[0] - '0');
                    else if (!Enum.TryParse(part, ignoreCase: true, out key) || key == Keys.None)
                        throw new FormatException($"Unsupported key '{part}' in '{binding}'.");
                    break;
            }
        }
        if (key == Keys.None || modifiers == 0)
            throw new FormatException($"Shortcut '{binding}' needs a key and at least one modifier.");
        return (modifiers, key);
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint virtualKey);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr window, int id);
}
