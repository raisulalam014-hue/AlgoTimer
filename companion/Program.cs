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

        var registered = _hotkeys.Register(_settings.Hotkeys);
        NativeMessaging.Write(new
        {
            type = "status",
            status = "connected",
            version = 1,
            hotkeys = _settings.Hotkeys,
            registered
        });
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
            case "hello":
                NativeMessaging.Write(new { type = "status", status = "connected", version = 1, hotkeys = _settings.Hotkeys });
                break;
        }
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
