namespace AlgoTimer.Companion;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new CompanionContext());
    }
}

internal sealed class CompanionContext : ApplicationContext
{
    private readonly CompanionWindow _window;
    private readonly GlobalHotkeys _hotkeys;
    private readonly CompanionSettings _settings;
    private Dictionary<string, bool> _registeredHotkeys = new(StringComparer.OrdinalIgnoreCase);

    public CompanionContext()
    {
        _settings = CompanionSettings.Load();
        _settings.EnsureSaved();
        _window = new CompanionWindow(_settings);
        _ = _window.Handle;
        _hotkeys = new GlobalHotkeys();
        _hotkeys.CommandPressed += OnHotkey;
        _hotkeys.RegistrationFailed += (command, binding, error) =>
        {
            NativeMessaging.Write(new
            {
                type = "hotkey-status",
                command,
                binding,
                registered = false,
                error
            });
            _window.SetConnectionMessage($"Shortcut unavailable: {binding}");
        };
        _window.CommandRequested += command => NativeMessaging.Write(new { type = "command", command });
        _window.SettingsChanged += SaveSettings;

        _registeredHotkeys = _hotkeys.Register(_settings.Hotkeys);
        _window.SetHotkeyRegistrationStatus(_registeredHotkeys);
        WriteStatus();
        _window.SetConnectionMessage("Connected to AlgoTimer · timer state syncs from Chrome");

        _ = Task.Run(() => NativeMessaging.ReadLoop(
            HandleExtensionMessage,
            () => _window.BeginInvoke((Action)Application.ExitThread)));
    }

    private void OnHotkey(string command)
    {
        if (command == "toggle-window")
        {
            _window.ToggleVisibility();
            return;
        }

        NativeMessaging.Write(new { type = "command", command });
    }

    private void HandleExtensionMessage(System.Text.Json.JsonElement message)
    {
        if (!message.TryGetProperty("type", out var typeValue)) return;
        var type = typeValue.GetString();
        switch (type)
        {
            case "state":
                if (message.TryGetProperty("state", out var state))
                {
                    var snapshot = state.Clone();
                    _window.BeginInvoke((Action)(() => _window.SetTimerState(snapshot)));
                }
                break;
            case "show-window":
                _window.BeginInvoke((Action)_window.ShowTimer);
                break;
            case "hide-window":
                _window.BeginInvoke((Action)_window.HideTimer);
                break;
            case "theme":
                if (message.TryGetProperty("theme", out var themeValue) && themeValue.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var theme = themeValue.GetString() ?? "sunset";
                    _window.BeginInvoke((Action)(() => _window.SetTheme(theme)));
                }
                break;
            case "set-hotkeys":
                if (message.TryGetProperty("hotkeys", out var hotkeysValue) &&
                    hotkeysValue.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    var configured = hotkeysValue.Clone();
                    _window.BeginInvoke((Action)(() => ApplyHotkeys(configured)));
                }
                break;
            case "set-window-settings":
            {
                var corner = message.TryGetProperty("corner", out var cornerValue) &&
                             cornerValue.ValueKind == System.Text.Json.JsonValueKind.String
                    ? cornerValue.GetString() ?? _window.Corner
                    : _window.Corner;
                var pinned = message.TryGetProperty("pinned", out var pinnedValue) &&
                             pinnedValue.ValueKind == System.Text.Json.JsonValueKind.True;
                _window.BeginInvoke((Action)(() =>
                {
                    _window.SetPositioning(corner, pinned);
                    WriteStatus("Native timer position saved.");
                }));
                break;
            }
            case "hello":
                WriteStatus();
                break;
        }
    }

    private Dictionary<string, bool> EnabledHotkeys() =>
        _settings.Hotkeys.ToDictionary(pair => pair.Key, pair => !string.IsNullOrWhiteSpace(pair.Value), StringComparer.OrdinalIgnoreCase);

    private void ApplyHotkeys(System.Text.Json.JsonElement hotkeys)
    {
        var configured = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var command in _settings.Hotkeys.Keys)
        {
            var binding = hotkeys.TryGetProperty(command, out var value) &&
                          value.ValueKind == System.Text.Json.JsonValueKind.String
                ? value.GetString() ?? ""
                : "";
            configured[command] = binding.Trim();
        }
        _settings.Hotkeys = configured;
        _settings.Save();
        _registeredHotkeys = _hotkeys.Register(_settings.Hotkeys);
        _window.SetHotkeyRegistrationStatus(_registeredHotkeys);
        WriteStatus("System-wide shortcuts saved.");
        _window.SetConnectionMessage("Global shortcuts saved · timer state syncs from Chrome");
    }

    private void WriteStatus(string? message = null)
    {
        NativeMessaging.Write(new
        {
            type = "status",
            status = "connected",
            version = 1,
            message,
            hotkeys = _settings.Hotkeys,
            registered = _registeredHotkeys,
            enabled = EnabledHotkeys(),
            corner = _window.Corner,
            pinned = _window.Pinned
        });
    }

    private void SaveSettings()
    {
        _settings.Pinned = _window.Pinned;
        _settings.Corner = _window.Corner;
        _settings.ScreenDevice = _window.ScreenDevice;
        _settings.Left = _window.Left;
        _settings.Top = _window.Top;
        _settings.Save();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _hotkeys.Dispose();
            _window.Dispose();
        }
        base.Dispose(disposing);
    }
}
