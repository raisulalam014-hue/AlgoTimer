using System.Drawing;
using System.Text.Json;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AlgoTimer.Companion;

internal sealed class CompanionWindow : Form
{
    private readonly CompanionSettings _settings;
    private readonly Label _clock = new();
    private readonly Label _secondaryClock = new();
    private readonly Label _status = new();
    private readonly Label _connection = new();
    private readonly Font _singleClockFont = new("Segoe UI", 35F, FontStyle.Bold);
    private readonly Font _dualClockFont = new("Segoe UI", 24F, FontStyle.Bold);
    private Panel? _header;
    private Panel? _content;
    private Panel? _themeBar;
    private Button _runButton = null!;
    private Button _pinButton = null!;
    private readonly ComboBox _cornerPicker = new();
    private readonly ComboBox _screenPicker = new();
    private readonly System.Windows.Forms.Timer _renderTimer = new();
    private readonly System.Windows.Forms.Timer _moveTimer = new();
    private JsonElement? _snapshot;
    private bool _applyingPosition;
    private string _theme = "sunset";

    public event Action<string>? CommandRequested;
    public event Action? SettingsChanged;

    public bool Pinned => _settings.Pinned;
    public string Corner => _settings.Corner;
    public string? ScreenDevice => _settings.ScreenDevice;

    public void SetPositioning(string corner, bool pinned)
    {
        if (corner is not ("top-left" or "top-right" or "bottom-left" or "bottom-right")) return;
        _settings.Corner = corner;
        _settings.Pinned = pinned;
        _cornerPicker.SelectedIndex = CornerIndex(corner);
        UpdatePinLabel();
        SetTheme(_theme);
        if (pinned) ApplyCornerPosition();
        else SaveCurrentSettings();
    }

    public CompanionWindow(CompanionSettings settings)
    {
        _settings = settings;
        Text = "AlgoTimer Companion";
        Width = 352;
        Height = 292;
        MinimumSize = new Size(352, 292);
        MaximumSize = new Size(352, 292);
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        KeyPreview = true;
        BackColor = Color.FromArgb(248, 250, 253);
        Font = new Font("Segoe UI", 9F);
        Padding = new Padding(1);

        BuildSurface();
        PopulateDisplays();
        RestorePosition();
        UpdatePinLabel();
        SetTheme(_theme);

        _renderTimer.Interval = 200;
        _renderTimer.Tick += (_, _) => RenderTimerState();
        _renderTimer.Start();
        _moveTimer.Interval = 350;
        _moveTimer.Tick += (_, _) =>
        {
            _moveTimer.Stop();
            CompleteFreeMove();
        };
        LocationChanged += (_, _) =>
        {
            if (!_applyingPosition && !_settings.Pinned) _moveTimer.Start();
        };
        FormClosing += (_, e) =>
        {
            e.Cancel = true;
            HideTimer();
        };
        SystemEvents.DisplaySettingsChanged += OnDisplaySettingsChanged;
        KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.P && e.Modifiers == Keys.None)
            {
                TogglePin();
                e.Handled = true;
            }
        };

        Hide();
    }

    public void SetTimerState(JsonElement state)
    {
        _snapshot = state;
        RenderTimerState();
    }

    public void SetConnectionMessage(string message) => _connection.Text = message;

    public void SetTheme(string theme)
    {
        _theme = theme switch
        {
            "warm" or "aurora" or "graphite" or "black" => theme,
            "cyan" => "warm",
            "violet" => "aurora",
            "emerald" => "graphite",
            _ => "sunset"
        };
        var (surface, canvas, ink, muted, accent, border) = _theme switch
        {
            "warm" => (ColorTranslator.FromHtml("#fffdf9"), ColorTranslator.FromHtml("#f4f0e9"), ColorTranslator.FromHtml("#3e332a"), ColorTranslator.FromHtml("#75685d"), ColorTranslator.FromHtml("#e86825"), ColorTranslator.FromHtml("#e8ded3")),
            "aurora" => (Color.White, ColorTranslator.FromHtml("#eef0fb"), ColorTranslator.FromHtml("#24294e"), ColorTranslator.FromHtml("#59617e"), ColorTranslator.FromHtml("#6758d8"), ColorTranslator.FromHtml("#dce0f2")),
            "graphite" => (ColorTranslator.FromHtml("#24232b"), ColorTranslator.FromHtml("#19181e"), ColorTranslator.FromHtml("#f0eef6"), ColorTranslator.FromHtml("#b8b3c5"), ColorTranslator.FromHtml("#b59aff"), ColorTranslator.FromHtml("#393741")),
            "black" => (ColorTranslator.FromHtml("#080808"), Color.Black, ColorTranslator.FromHtml("#f5f5f5"), ColorTranslator.FromHtml("#c8c8c8"), ColorTranslator.FromHtml("#f5cc55"), ColorTranslator.FromHtml("#292929")),
            _ => (ColorTranslator.FromHtml("#241b26"), ColorTranslator.FromHtml("#17131b"), ColorTranslator.FromHtml("#f9edf0"), ColorTranslator.FromHtml("#c8a9b5"), ColorTranslator.FromHtml("#fb795f"), ColorTranslator.FromHtml("#48313f"))
        };
        BackColor = canvas;
        if (_header is not null) _header.BackColor = surface;
        if (_content is not null) _content.BackColor = surface;
        _clock.ForeColor = ink;
        _secondaryClock.ForeColor = muted;
        _status.ForeColor = muted;
        _connection.ForeColor = muted;
        _runButton.BackColor = accent;
        _runButton.FlatAppearance.BorderColor = accent;
        _runButton.ForeColor = Color.White;
        if (_themeBar is not null) _themeBar.BackColor = accent;
        _cornerPicker.BackColor = surface;
        _cornerPicker.ForeColor = ink;
        _screenPicker.BackColor = surface;
        _screenPicker.ForeColor = ink;
        foreach (var button in FindButtons(this).Where(button => button != _runButton && button != _pinButton))
        {
            button.BackColor = surface;
            button.ForeColor = ink;
            button.FlatAppearance.BorderColor = border;
        }
        foreach (var label in FindLabels(this)) label.ForeColor = ink;
        _secondaryClock.ForeColor = muted;
        _status.ForeColor = muted;
        _connection.ForeColor = muted;
        _pinButton.BackColor = _settings.Pinned
            ? Color.FromArgb((accent.R + 255) / 2, (accent.G + 255) / 2, (accent.B + 255) / 2)
            : surface;
        _pinButton.ForeColor = _settings.Pinned ? accent : ink;
        _pinButton.FlatAppearance.BorderColor = border;
    }

    private static IEnumerable<Button> FindButtons(Control parent)
    {
        foreach (Control child in parent.Controls)
        {
            if (child is Button button) yield return button;
            foreach (var nested in FindButtons(child)) yield return nested;
        }
    }

    private static IEnumerable<Label> FindLabels(Control parent)
    {
        foreach (Control child in parent.Controls)
        {
            if (child is Label label) yield return label;
            foreach (var nested in FindLabels(child)) yield return nested;
        }
    }

    public void ShowTimer()
    {
        if (_settings.Pinned) ApplyCornerPosition();
        else RestorePosition();
        Show();
        WindowState = FormWindowState.Normal;
        TopMost = true;
        Activate();
    }

    public void HideTimer() => Hide();

    public void ToggleVisibility()
    {
        if (Visible) HideTimer();
        else ShowTimer();
    }

    private void BuildSurface()
    {
        var header = new Panel
        {
            Dock = DockStyle.Top,
            Height = 42,
            BackColor = Color.White,
            Padding = new Padding(14, 0, 10, 0)
        };
        _header = header;
        var title = new Label
        {
            Text = "●  AlgoTimer",
            Dock = DockStyle.Left,
            Width = 140,
            ForeColor = Color.FromArgb(38, 51, 74),
            Font = new Font("Segoe UI Semibold", 10F),
            TextAlign = ContentAlignment.MiddleLeft
        };
        var hideButton = MakeButton("×", false);
        hideButton.Dock = DockStyle.Right;
        hideButton.Width = 32;
        hideButton.Click += (_, _) => HideTimer();
        header.Controls.Add(hideButton);
        header.Controls.Add(title);
        EnableDrag(header);
        EnableDrag(title);
        Controls.Add(header);

        var content = new Panel { Dock = DockStyle.Fill, Padding = new Padding(16, 10, 16, 10) };
        _content = content;
        _status.Text = "Waiting for Chrome";
        _status.ForeColor = Color.FromArgb(105, 118, 139);
        _status.Font = new Font("Segoe UI", 8.5F);
        _status.Location = new Point(16, 8);
        _status.AutoSize = true;

        _clock.Text = "--:--";
        _clock.Font = new Font("Segoe UI", 35F, FontStyle.Bold);
        _clock.ForeColor = Color.FromArgb(25, 39, 61);
        _clock.Location = new Point(14, 30);
        _clock.Size = new Size(318, 61);
        _clock.TextAlign = ContentAlignment.MiddleCenter;

        _secondaryClock.Text = "";
        _secondaryClock.Font = new Font("Segoe UI", 9F);
        _secondaryClock.ForeColor = Color.FromArgb(102, 117, 139);
        _secondaryClock.Location = new Point(16, 90);
        _secondaryClock.Size = new Size(316, 20);
        _secondaryClock.TextAlign = ContentAlignment.MiddleCenter;

        var controls = new FlowLayoutPanel
        {
            Location = new Point(16, 116),
            Size = new Size(318, 38),
            WrapContents = false
        };
        _runButton = MakeButton("Start / Resume", true);
        _runButton.Width = 146;
        _runButton.Click += (_, _) => CommandRequested?.Invoke(IsAnyTimerRunning() ? "pause-timer" : "start-timer");
        var lapButton = MakeButton("Lap", false);
        lapButton.Width = 76;
        lapButton.Click += (_, _) => CommandRequested?.Invoke("record-lap");
        var resetButton = MakeButton("Reset", false);
        resetButton.Width = 76;
        resetButton.Click += (_, _) => CommandRequested?.Invoke("reset-timer");
        controls.Controls.AddRange([_runButton, lapButton, resetButton]);

        _cornerPicker.DropDownStyle = ComboBoxStyle.DropDownList;
        _cornerPicker.Items.AddRange(["Top left", "Top right", "Bottom left", "Bottom right"]);
        _cornerPicker.SelectedIndex = CornerIndex(_settings.Corner);
        _cornerPicker.Location = new Point(16, 162);
        _cornerPicker.Size = new Size(115, 26);
        _cornerPicker.SelectedIndexChanged += (_, _) =>
        {
            _settings.Corner = CornerValue(_cornerPicker.SelectedIndex);
            if (_settings.Pinned) ApplyCornerPosition();
            SaveCurrentSettings();
        };

        _screenPicker.DropDownStyle = ComboBoxStyle.DropDownList;
        _screenPicker.Location = new Point(138, 162);
        _screenPicker.Size = new Size(125, 26);
        _screenPicker.SelectedIndexChanged += (_, _) =>
        {
            if (_screenPicker.SelectedItem is DisplayChoice display)
            {
                _settings.ScreenDevice = display.Device;
                if (_settings.Pinned) ApplyCornerPosition();
                SaveCurrentSettings();
            }
        };

        _pinButton = MakeButton("Pin", false);
        _pinButton.Location = new Point(270, 160);
        _pinButton.Size = new Size(64, 28);
        _pinButton.Click += (_, _) => TogglePin();

        var editHotkeysButton = MakeButton("Edit shortcuts", false);
        editHotkeysButton.Location = new Point(16, 194);
        editHotkeysButton.Size = new Size(106, 26);
        editHotkeysButton.Click += (_, _) =>
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(
                    "notepad.exe",
                    $"\"{CompanionSettings.FilePath}\"")
                {
                    UseShellExecute = false
                });
                _connection.Text = "Save shortcuts, then reload AlgoTimer in Chrome to apply";
            }
            catch (Exception error)
            {
                _connection.Text = $"Could not open settings: {error.Message}";
            }
        };

        _connection.Text = "Connect AlgoTimer in Chrome to start";
        _connection.ForeColor = Color.FromArgb(113, 128, 150);
        _connection.Font = new Font("Segoe UI", 7.5F);
        _connection.Location = new Point(16, 226);
        _connection.Size = new Size(318, 16);
        content.Controls.AddRange([_status, _clock, _secondaryClock, controls, _cornerPicker, _screenPicker, _pinButton, editHotkeysButton, _connection]);
        Controls.Add(content);
        SetTheme(_theme);

        var border = new Panel { Dock = DockStyle.Top, Height = 3, BackColor = Color.FromArgb(91, 91, 214) };
        _themeBar = border;
        Controls.Add(border);
        border.BringToFront();
    }

    private Button MakeButton(string text, bool primary)
    {
        var button = new Button
        {
            Text = text,
            Height = 34,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI Semibold", 8.5F),
            ForeColor = primary ? Color.White : Color.FromArgb(76, 91, 114),
            BackColor = primary ? Color.FromArgb(91, 91, 214) : Color.White,
            Margin = new Padding(0, 0, 7, 0),
            Cursor = Cursors.Hand
        };
        button.FlatAppearance.BorderColor = primary ? Color.FromArgb(91, 91, 214) : Color.FromArgb(224, 229, 237);
        button.FlatAppearance.BorderSize = 1;
        return button;
    }

    private void PopulateDisplays()
    {
        var displays = Screen.AllScreens.Select((screen, index) =>
            new DisplayChoice($"Display {index + 1}", screen.DeviceName)).ToArray();
        _screenPicker.Items.AddRange(displays);
        var match = Array.FindIndex(displays, display => display.Device == _settings.ScreenDevice);
        _screenPicker.SelectedIndex = match >= 0 ? match : Math.Max(0, Array.FindIndex(Screen.AllScreens, screen => screen.Primary));
        if (_screenPicker.SelectedItem is DisplayChoice selected) _settings.ScreenDevice = selected.Device;
    }

    private void RenderTimerState()
    {
        if (_snapshot is not { } state)
        {
            _status.Text = "Waiting for timer state from Chrome";
            _clock.Text = "--:--";
            _runButton.Text = "Start / Resume";
            return;
        }

        var mode = GetString(state, "mode", "stopwatch");
        var stopwatch = GetProperty(state, "stopwatch");
        var target = GetProperty(state, "targetTimer");
        var swElapsed = GetElapsed(stopwatch);
        var targetElapsed = GetElapsed(target);
        var duration = GetNumber(target, "targetDurationMs");
        var remaining = Math.Max(0, duration - targetElapsed);
        var anyRunning = IsRunning(stopwatch) || IsRunning(target);
        var status = mode == "timer" ? GetString(target, "status", "stopped") : GetString(stopwatch, "status", "stopped");
        _status.Text = $"{(anyRunning ? "●  Running" : $"●  {status}")}   ·   {mode switch { "dual" => "Dual timers", "timer" => "Target timer", _ => "Stopwatch" }}";
        _runButton.Text = anyRunning ? "Pause" : "Start / Resume";

        if (mode == "dual")
        {
            _clock.Font = _dualClockFont;
            _clock.Text = FormatDuration(swElapsed);
            _secondaryClock.Text = $"STOPWATCH ELAPSED     ·     TARGET {FormatDuration(remaining)} REMAINING";
        }
        else if (mode == "timer")
        {
            _clock.Font = _singleClockFont;
            _clock.Text = FormatDuration(remaining);
            _secondaryClock.Text = $"TARGET COUNTDOWN  ·  {FormatDuration(duration)} TOTAL";
        }
        else
        {
            _clock.Font = _singleClockFont;
            _clock.Text = FormatDuration(swElapsed);
            _secondaryClock.Text = $"STOPWATCH  ·  {GetNumber(state, "laps", 0)} LAPS";
        }
    }

    private bool IsAnyTimerRunning()
    {
        if (_snapshot is not { } state) return false;
        return IsRunning(GetProperty(state, "stopwatch")) || IsRunning(GetProperty(state, "targetTimer"));
    }

    private void TogglePin()
    {
        _settings.Pinned = !_settings.Pinned;
        UpdatePinLabel();
        SetTheme(_theme);
        if (_settings.Pinned) ApplyCornerPosition();
        else SaveCurrentSettings();
        _connection.Text = _settings.Pinned
            ? "Always on top · pinned to the selected display corner"
            : "Always on top · drag to move, release near a corner to snap";
        SettingsChanged?.Invoke();
    }

    private void UpdatePinLabel()
    {
        _pinButton.Text = _settings.Pinned ? "Pinned" : "Pin";
        _pinButton.BackColor = _settings.Pinned ? Color.FromArgb(240, 239, 255) : Color.White;
        _pinButton.ForeColor = _settings.Pinned ? Color.FromArgb(79, 79, 190) : Color.FromArgb(76, 91, 114);
        _pinButton.FlatAppearance.BorderColor = _settings.Pinned ? Color.FromArgb(211, 209, 250) : Color.FromArgb(224, 229, 237);
    }

    private void ApplyCornerPosition()
    {
        var screen = SelectedScreen();
        var area = screen.WorkingArea;
        const int margin = 16;
        var left = _settings.Corner.EndsWith("right", StringComparison.Ordinal)
            ? area.Right - Width - margin
            : area.Left + margin;
        var top = _settings.Corner.StartsWith("bottom", StringComparison.Ordinal)
            ? area.Bottom - Height - margin
            : area.Top + margin;
        SetLocationClamped(left, top, area);
        SaveCurrentSettings();
    }

    private void RestorePosition()
    {
        var screen = SelectedScreen();
        if (_settings.Left.HasValue && _settings.Top.HasValue)
            SetLocationClamped(_settings.Left.Value, _settings.Top.Value, screen.WorkingArea);
        else
            ApplyCornerPosition();
    }

    private void CompleteFreeMove()
    {
        var screen = Screen.FromControl(this);
        _settings.ScreenDevice = screen.DeviceName;
        var corners = new[]
        {
            ("top-left", screen.WorkingArea.Left + 16, screen.WorkingArea.Top + 16),
            ("top-right", screen.WorkingArea.Right - Width - 16, screen.WorkingArea.Top + 16),
            ("bottom-left", screen.WorkingArea.Left + 16, screen.WorkingArea.Bottom - Height - 16),
            ("bottom-right", screen.WorkingArea.Right - Width - 16, screen.WorkingArea.Bottom - Height - 16)
        };
        var nearest = corners.OrderBy(point => Math.Hypot(Left - point.Item2, Top - point.Item3)).First();
        var distance = Math.Hypot(Left - nearest.Item2, Top - nearest.Item3);
        if (distance <= 88)
        {
            _settings.Corner = nearest.Item1;
            _settings.Pinned = true;
            _cornerPicker.SelectedIndex = CornerIndex(_settings.Corner);
            UpdatePinLabel();
            SetTheme(_theme);
            ApplyCornerPosition();
        }
        else
        {
            SaveCurrentSettings();
        }
    }

    private void OnDisplaySettingsChanged(object? sender, EventArgs e)
    {
        if (!IsHandleCreated || IsDisposed) return;
        BeginInvoke((Action)(() =>
        {
            if (_settings.Pinned) ApplyCornerPosition();
            else SetLocationClamped(Left, Top, Screen.FromControl(this).WorkingArea);
            SaveCurrentSettings();
        }));
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) SystemEvents.DisplaySettingsChanged -= OnDisplaySettingsChanged;
        base.Dispose(disposing);
        if (disposing)
        {
            _singleClockFont.Dispose();
            _dualClockFont.Dispose();
        }
    }

    private void SetLocationClamped(int left, int top, Rectangle area)
    {
        _applyingPosition = true;
        Location = new Point(
            Math.Clamp(left, area.Left, Math.Max(area.Left, area.Right - Width)),
            Math.Clamp(top, area.Top, Math.Max(area.Top, area.Bottom - Height)));
        _applyingPosition = false;
    }

    private Screen SelectedScreen()
    {
        if (_screenPicker.SelectedItem is DisplayChoice display)
        {
            var screen = Screen.AllScreens.FirstOrDefault(item => item.DeviceName == display.Device);
            if (screen is not null) return screen;
        }
        return Screen.PrimaryScreen ?? Screen.AllScreens[0];
    }

    private void SaveCurrentSettings()
    {
        if (!Pinned)
        {
            _settings.Left = Left;
            _settings.Top = Top;
            _settings.ScreenDevice = Screen.FromControl(this).DeviceName;
        }
        SettingsChanged?.Invoke();
    }

    private void EnableDrag(Control control)
    {
        control.MouseDown += (_, e) =>
        {
            if (_settings.Pinned || e.Button != MouseButtons.Left) return;
            NativeMethods.ReleaseCapture();
            NativeMethods.SendMessage(Handle, NativeMethods.WmNcLButtonDown, NativeMethods.HtCaption, 0);
        };
    }

    private static int CornerIndex(string corner) => corner switch
    {
        "top-left" => 0,
        "top-right" => 1,
        "bottom-left" => 2,
        _ => 3
    };

    private static string CornerValue(int index) => index switch
    {
        0 => "top-left",
        1 => "top-right",
        2 => "bottom-left",
        _ => "bottom-right"
    };

    private static JsonElement GetProperty(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) ? value : default;

    private static string GetString(JsonElement element, string property, string fallback)
    {
        var value = GetProperty(element, property);
        return value.ValueKind == JsonValueKind.String ? value.GetString() ?? fallback : fallback;
    }

    private static double GetNumber(JsonElement element, string property, double fallback = 0)
    {
        var value = GetProperty(element, property);
        if (value.ValueKind == JsonValueKind.Array) return value.GetArrayLength();
        return value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) ? number : fallback;
    }

    private static double GetElapsed(JsonElement timer)
    {
        var elapsed = GetNumber(timer, "elapsedBeforePause");
        if (GetString(timer, "status", "stopped") != "running") return elapsed;
        var start = GetNumber(timer, "startTime");
        return elapsed + Math.Max(0, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - start);
    }

    private static bool IsRunning(JsonElement timer) => GetString(timer, "status", "stopped") == "running";

    private static string FormatDuration(double milliseconds)
    {
        var seconds = Math.Max(0, (long)(milliseconds / 1000));
        var hours = seconds / 3600;
        return hours > 0
            ? $"{hours:00}:{seconds / 60 % 60:00}:{seconds % 60:00}"
            : $"{seconds / 60:00}:{seconds % 60:00}";
    }

    private sealed record DisplayChoice(string Name, string Device)
    {
        public override string ToString() => Name;
    }

    private static class NativeMethods
    {
        public const int WmNcLButtonDown = 0x00A1;
        public const int HtCaption = 0x0002;

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr handle, int message, int wParam, int lParam);
    }
}
