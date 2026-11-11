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
    private readonly Label _shortcutSummary = new();
    private readonly Font _singleClockFont = new("Consolas", 35F, FontStyle.Bold);
    private readonly Font _dualClockFont = new("Consolas", 24F, FontStyle.Bold);
    private Panel? _header;
    private Panel? _content;
    private Panel? _themeBar;
    private Label? _brandMark;
    private RoundedPanel? _timerCard;
    private RoundedPanel? _placementCard;
    private RoundedPanel? _shortcutCard;
    private Button _runButton = null!;
    private Button _pinButton = null!;
    private readonly ComboBox _cornerPicker = new();
    private readonly ComboBox _screenPicker = new();
    private readonly System.Windows.Forms.Timer _renderTimer = new();
    private readonly System.Windows.Forms.Timer _moveTimer = new();
    private JsonElement? _snapshot;
    private bool _applyingPosition;
    private string _theme = "sunset";
    private Color _surfaceColor = Color.FromArgb(20, 29, 43);
    private Color _canvasColor = Color.FromArgb(11, 17, 28);
    private Color _inkColor = Color.FromArgb(239, 246, 255);
    private Color _mutedColor = Color.FromArgb(146, 162, 183);
    private Color _borderColor = Color.FromArgb(39, 53, 72);
    private Color _accentColor = Color.FromArgb(65, 205, 225);
    private Color _statusAccentColor = Color.FromArgb(65, 205, 225);
    private Color _accentInkColor = Color.FromArgb(7, 22, 29);
    private Color _accentSoftColor = Color.FromArgb(31, 55, 69);
    private Dictionary<string, bool> _registeredHotkeys = new(StringComparer.OrdinalIgnoreCase);

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
        Width = 410;
        Height = 490;
        MinimumSize = new Size(410, 490);
        MaximumSize = new Size(410, 490);
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        KeyPreview = true;
        BackColor = _canvasColor;
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

    public void SetHotkeyRegistrationStatus(IReadOnlyDictionary<string, bool> registered)
    {
        _registeredHotkeys = new Dictionary<string, bool>(registered, StringComparer.OrdinalIgnoreCase);
        var activeCount = _settings.Hotkeys.Count(pair =>
            !string.IsNullOrWhiteSpace(pair.Value) &&
            _registeredHotkeys.TryGetValue(pair.Key, out var isRegistered) &&
            isRegistered);
        var unavailableCount = _settings.Hotkeys.Count(pair =>
            !string.IsNullOrWhiteSpace(pair.Value) &&
            (!_registeredHotkeys.TryGetValue(pair.Key, out var isRegistered) || !isRegistered));
        _shortcutSummary.Text = unavailableCount == 0
            ? $"{activeCount} shortcuts active"
            : $"{activeCount} active | {unavailableCount} unavailable";
    }

    public void SetTheme(string theme)
    {
        _theme = theme switch
        {
            "warm" or "aurora" or "graphite" or "black" or "minimal" or "dashboard" or "purple" or "glass" or "navy" => theme,
            "cyan" => "warm",
            "violet" => "aurora",
            "emerald" => "graphite",
            _ => "sunset"
        };
        var palette = _theme switch
        {
            "warm" => (
                Surface: ColorTranslator.FromHtml("#FFFDF9"),
                Canvas: ColorTranslator.FromHtml("#F4F0E9"),
                Ink: ColorTranslator.FromHtml("#3E332A"),
                Muted: ColorTranslator.FromHtml("#706253"),
                Border: ColorTranslator.FromHtml("#E2D9CE"),
                Accent: ColorTranslator.FromHtml("#B84D1C"),
                AccentInk: Color.White,
                AccentSoft: ColorTranslator.FromHtml("#FFF0E4")),
            "aurora" => (
                Surface: Color.White,
                Canvas: ColorTranslator.FromHtml("#EEF0FB"),
                Ink: ColorTranslator.FromHtml("#24294E"),
                Muted: ColorTranslator.FromHtml("#626A88"),
                Border: ColorTranslator.FromHtml("#DCE0F2"),
                Accent: ColorTranslator.FromHtml("#6758D8"),
                AccentInk: Color.White,
                AccentSoft: ColorTranslator.FromHtml("#F0EDFF")),
            "graphite" => (
                Surface: ColorTranslator.FromHtml("#24232B"),
                Canvas: ColorTranslator.FromHtml("#19181E"),
                Ink: ColorTranslator.FromHtml("#F0EEF6"),
                Muted: ColorTranslator.FromHtml("#B8B3C5"),
                Border: ColorTranslator.FromHtml("#393741"),
                Accent: ColorTranslator.FromHtml("#C0A3FF"),
                AccentInk: ColorTranslator.FromHtml("#17121F"),
                AccentSoft: ColorTranslator.FromHtml("#342D42")),
            "black" => (
                Surface: ColorTranslator.FromHtml("#080808"),
                Canvas: Color.Black,
                Ink: ColorTranslator.FromHtml("#F5F5F5"),
                Muted: ColorTranslator.FromHtml("#B7B7B7"),
                Border: ColorTranslator.FromHtml("#292929"),
                Accent: ColorTranslator.FromHtml("#F5CC55"),
                AccentInk: ColorTranslator.FromHtml("#17140B"),
                AccentSoft: ColorTranslator.FromHtml("#211D10")),
            "minimal" => (
                Surface: ColorTranslator.FromHtml("#12171D"),
                Canvas: ColorTranslator.FromHtml("#0B0E12"),
                Ink: ColorTranslator.FromHtml("#EDF2F8"),
                Muted: ColorTranslator.FromHtml("#A4AFBD"),
                Border: ColorTranslator.FromHtml("#29323D"),
                Accent: ColorTranslator.FromHtml("#65A9FF"),
                AccentInk: ColorTranslator.FromHtml("#071626"),
                AccentSoft: ColorTranslator.FromHtml("#17283B")),
            "dashboard" => (
                Surface: ColorTranslator.FromHtml("#18252E"),
                Canvas: ColorTranslator.FromHtml("#10191F"),
                Ink: ColorTranslator.FromHtml("#E8F1F5"),
                Muted: ColorTranslator.FromHtml("#AEC0CA"),
                Border: ColorTranslator.FromHtml("#30414C"),
                Accent: ColorTranslator.FromHtml("#54CBBD"),
                AccentInk: ColorTranslator.FromHtml("#082522"),
                AccentSoft: ColorTranslator.FromHtml("#1A3736")),
            "purple" => (
                Surface: ColorTranslator.FromHtml("#1C1730"),
                Canvas: ColorTranslator.FromHtml("#100D1C"),
                Ink: ColorTranslator.FromHtml("#F3EFFC"),
                Muted: ColorTranslator.FromHtml("#BBB2CF"),
                Border: ColorTranslator.FromHtml("#3A3150"),
                Accent: ColorTranslator.FromHtml("#B8A0FF"),
                AccentInk: ColorTranslator.FromHtml("#201738"),
                AccentSoft: ColorTranslator.FromHtml("#302748")),
            "glass" => (
                Surface: ColorTranslator.FromHtml("#FBFCFF"),
                Canvas: ColorTranslator.FromHtml("#EDF1F8"),
                Ink: ColorTranslator.FromHtml("#293247"),
                Muted: ColorTranslator.FromHtml("#5D677D"),
                Border: ColorTranslator.FromHtml("#D7DEEA"),
                Accent: ColorTranslator.FromHtml("#A74668"),
                AccentInk: Color.White,
                AccentSoft: ColorTranslator.FromHtml("#F8EAF0")),
            "navy" => (
                Surface: ColorTranslator.FromHtml("#0E2232"),
                Canvas: ColorTranslator.FromHtml("#071421"),
                Ink: ColorTranslator.FromHtml("#EDF7FB"),
                Muted: ColorTranslator.FromHtml("#A7C0CF"),
                Border: ColorTranslator.FromHtml("#244254"),
                Accent: ColorTranslator.FromHtml("#43D1E4"),
                AccentInk: ColorTranslator.FromHtml("#06242A"),
                AccentSoft: ColorTranslator.FromHtml("#12323D")),
            _ => (
                Surface: ColorTranslator.FromHtml("#141D2B"),
                Canvas: ColorTranslator.FromHtml("#0B111C"),
                Ink: ColorTranslator.FromHtml("#EFF6FF"),
                Muted: ColorTranslator.FromHtml("#A0AEC0"),
                Border: ColorTranslator.FromHtml("#273548"),
                Accent: ColorTranslator.FromHtml("#FB795F"),
                AccentInk: ColorTranslator.FromHtml("#241313"),
                AccentSoft: ColorTranslator.FromHtml("#39232C"))
        };
        _surfaceColor = palette.Surface;
        _canvasColor = palette.Canvas;
        _inkColor = palette.Ink;
        _mutedColor = palette.Muted;
        _borderColor = palette.Border;
        _accentColor = palette.Accent;
        _accentInkColor = palette.AccentInk;
        _accentSoftColor = palette.AccentSoft;
        _statusAccentColor = _theme == "navy"
            ? ColorTranslator.FromHtml("#ED78AD")
            : _accentColor;
        BackColor = _canvasColor;
        if (_header is not null) _header.BackColor = _canvasColor;
        if (_content is not null) _content.BackColor = _canvasColor;
        if (_timerCard is not null) _timerCard.SetColors(_surfaceColor, _borderColor);
        if (_placementCard is not null) _placementCard.SetColors(_surfaceColor, _borderColor);
        if (_shortcutCard is not null) _shortcutCard.SetColors(_surfaceColor, _borderColor);
        _clock.ForeColor = _inkColor;
        _secondaryClock.ForeColor = _mutedColor;
        _status.ForeColor = IsAnyTimerRunning() ? _statusAccentColor : _mutedColor;
        _connection.ForeColor = _mutedColor;
        _shortcutSummary.ForeColor = _mutedColor;
        _runButton.BackColor = _accentColor;
        _runButton.ForeColor = _accentInkColor;
        _runButton.FlatAppearance.BorderColor = _accentColor;
        _runButton.FlatAppearance.MouseOverBackColor = ControlPaint.Light(_accentColor, 0.12F);
        if (_themeBar is not null) _themeBar.BackColor = _borderColor;
        _cornerPicker.BackColor = _surfaceColor;
        _cornerPicker.ForeColor = _inkColor;
        _screenPicker.BackColor = _surfaceColor;
        _screenPicker.ForeColor = _inkColor;
        foreach (var button in FindButtons(this).Where(button => button != _runButton && button != _pinButton))
        {
            button.BackColor = _surfaceColor;
            button.ForeColor = _inkColor;
            button.FlatAppearance.BorderColor = _borderColor;
            button.FlatAppearance.MouseOverBackColor = ControlPaint.Light(_surfaceColor, 0.08F);
        }
        foreach (var label in FindLabels(this))
        {
            label.ForeColor = (label.Tag as string) switch
            {
                "muted" => _mutedColor,
                "accent" => _accentColor,
                _ => _inkColor
            };
        }
        _clock.ForeColor = _inkColor;
        _secondaryClock.ForeColor = _mutedColor;
        _status.ForeColor = IsAnyTimerRunning() ? _statusAccentColor : _mutedColor;
        _connection.ForeColor = _mutedColor;
        _shortcutSummary.ForeColor = _mutedColor;
        if (_brandMark is not null)
        {
            _brandMark.BackColor = _accentColor;
            _brandMark.ForeColor = _accentInkColor;
        }
        _pinButton.BackColor = _settings.Pinned ? _accentSoftColor : _surfaceColor;
        _pinButton.ForeColor = _settings.Pinned ? _accentColor : _inkColor;
        _pinButton.FlatAppearance.BorderColor = _settings.Pinned ? _accentColor : _borderColor;
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
            Height = 48,
            BackColor = _canvasColor,
            Padding = new Padding(17, 10, 12, 10)
        };
        _header = header;
        var mark = new Label
        {
            Text = "A",
            Dock = DockStyle.Left,
            Width = 28,
            Height = 28,
            BackColor = _accentColor,
            ForeColor = Color.FromArgb(8, 20, 29),
            Font = new Font("Segoe UI", 11F, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter,
            Margin = new Padding(0, 10, 9, 0)
        };
        _brandMark = mark;
        var brand = new Panel { Dock = DockStyle.Left, Width = 208 };
        var title = new Label
        {
            Text = "AlgoTimer",
            Location = new Point(0, -2),
            Size = new Size(140, 20),
            ForeColor = _inkColor,
            Font = new Font("Segoe UI Semibold", 10F),
            TextAlign = ContentAlignment.MiddleLeft
        };
        var subtitle = new Label
        {
            Text = "WINDOWS COMPANION",
            Location = new Point(0, 15),
            Size = new Size(180, 13),
            ForeColor = _mutedColor,
            Font = new Font("Segoe UI", 7F, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft
        };
        subtitle.Tag = "muted";
        brand.Controls.AddRange([title, subtitle]);
        var hideButton = MakeButton("X", false, 30);
        hideButton.Dock = DockStyle.Right;
        hideButton.Height = 28;
        hideButton.Click += (_, _) => HideTimer();
        header.Controls.Add(hideButton);
        header.Controls.Add(brand);
        header.Controls.Add(mark);
        EnableDrag(header);
        EnableDrag(mark);
        EnableDrag(brand);
        EnableDrag(title);
        EnableDrag(subtitle);
        Controls.Add(header);

        var content = new Panel { Dock = DockStyle.Fill, Padding = new Padding(14, 0, 14, 0) };
        _content = content;
        _status.Text = "WAITING FOR CHROME";
        _status.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        _status.Location = new Point(22, 8);
        _status.Size = new Size(350, 16);

        _timerCard = MakeCard(12, 30, 370, 132);
        _clock.Text = "--:--";
        _clock.Font = _singleClockFont;
        _clock.Location = new Point(15, 27);
        _clock.Size = new Size(340, 62);
        _clock.TextAlign = ContentAlignment.MiddleCenter;

        _secondaryClock.Text = "SYNCING TIMER STATE";
        _secondaryClock.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        _secondaryClock.Location = new Point(15, 91);
        _secondaryClock.Size = new Size(340, 20);
        _secondaryClock.TextAlign = ContentAlignment.MiddleCenter;
        _timerCard.Controls.AddRange([_status, _clock, _secondaryClock]);

        var controls = new FlowLayoutPanel
        {
            Location = new Point(12, 174),
            Size = new Size(370, 42),
            WrapContents = false,
            BackColor = Color.Transparent
        };
        _runButton = MakeButton("Start / Resume", true, 168);
        _runButton.Click += (_, _) => CommandRequested?.Invoke(IsAnyTimerRunning() ? "pause-timer" : "start-timer");
        var lapButton = MakeButton("Lap", false, 87);
        lapButton.Click += (_, _) => CommandRequested?.Invoke("record-lap");
        var resetButton = MakeButton("Reset", false, 87);
        resetButton.Click += (_, _) => CommandRequested?.Invoke("reset-timer");
        controls.Controls.AddRange([_runButton, lapButton, resetButton]);

        _placementCard = MakeCard(12, 228, 370, 96);
        var placementTitle = MakeLabel("WINDOW POSITION", 14, 10, 180, 16, 8F, FontStyle.Bold, _mutedColor);
        placementTitle.Tag = "muted";
        var alwaysOnTop = MakeLabel("ALWAYS ON TOP", 248, 10, 108, 16, 7F, FontStyle.Bold, _accentColor);
        alwaysOnTop.Tag = "accent";
        alwaysOnTop.TextAlign = ContentAlignment.MiddleRight;
        _cornerPicker.DropDownStyle = ComboBoxStyle.DropDownList;
        _cornerPicker.FlatStyle = FlatStyle.Flat;
        _cornerPicker.Font = new Font("Segoe UI", 8.5F);
        _cornerPicker.Items.AddRange(["Top left", "Top right", "Bottom left", "Bottom right"]);
        _cornerPicker.SelectedIndex = CornerIndex(_settings.Corner);
        _cornerPicker.Location = new Point(13, 39);
        _cornerPicker.Size = new Size(112, 28);
        _cornerPicker.SelectedIndexChanged += (_, _) =>
        {
            _settings.Corner = CornerValue(_cornerPicker.SelectedIndex);
            if (_settings.Pinned) ApplyCornerPosition();
            SaveCurrentSettings();
        };

        _screenPicker.DropDownStyle = ComboBoxStyle.DropDownList;
        _screenPicker.FlatStyle = FlatStyle.Flat;
        _screenPicker.Font = new Font("Segoe UI", 8.5F);
        _screenPicker.Location = new Point(134, 39);
        _screenPicker.Size = new Size(133, 28);
        _screenPicker.SelectedIndexChanged += (_, _) =>
        {
            if (_screenPicker.SelectedItem is DisplayChoice display)
            {
                _settings.ScreenDevice = display.Device;
                if (_settings.Pinned) ApplyCornerPosition();
                SaveCurrentSettings();
            }
        };

        _pinButton = MakeButton("Pin corner", false, 91);
        _pinButton.Location = new Point(276, 39);
        _pinButton.Height = 29;
        _pinButton.Click += (_, _) => TogglePin();
        _placementCard.Controls.AddRange([placementTitle, alwaysOnTop, _cornerPicker, _screenPicker, _pinButton]);

        _shortcutCard = MakeCard(12, 340, 370, 52);
        var shortcutTitle = MakeLabel("SYSTEM-WIDE SHORTCUTS", 14, 8, 226, 17, 8F, FontStyle.Bold, _inkColor);
        _shortcutSummary.Text = "Waiting for shortcut status";
        _shortcutSummary.Font = new Font("Segoe UI", 7.5F);
        _shortcutSummary.Tag = "muted";
        _shortcutSummary.Location = new Point(14, 27);
        _shortcutSummary.Size = new Size(220, 15);
        var manageShortcuts = MakeButton("Manage", false, 84);
        manageShortcuts.Location = new Point(270, 11);
        manageShortcuts.Height = 30;
        manageShortcuts.Click += (_, _) => ShowShortcutDialog();
        _shortcutCard.Controls.AddRange([shortcutTitle, _shortcutSummary, manageShortcuts]);

        _connection.Text = "Connect AlgoTimer in Chrome to start";
        _connection.Font = new Font("Segoe UI", 7.5F);
        _connection.Tag = "muted";
        _connection.Location = new Point(22, 405);
        _connection.Size = new Size(350, 20);
        _connection.TextAlign = ContentAlignment.MiddleCenter;

        content.Controls.AddRange([_timerCard, controls, _placementCard, _shortcutCard, _connection]);
        Controls.Add(content);

        var border = new Panel { Dock = DockStyle.Top, Height = 1, BackColor = _borderColor };
        _themeBar = border;
        Controls.Add(border);
        border.BringToFront();
        SetTheme(_theme);
    }

    private RoundedPanel MakeCard(int x, int y, int width, int height)
    {
        var card = new RoundedPanel
        {
            Location = new Point(x, y),
            Size = new Size(width, height),
            BackColor = _surfaceColor,
            Radius = 10
        };
        card.SetColors(_surfaceColor, _borderColor);
        return card;
    }

    private static Label MakeLabel(string text, int x, int y, int width, int height, float size, FontStyle style, Color color) =>
        new()
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(width, height),
            Font = new Font("Segoe UI", size, style),
            ForeColor = color,
            BackColor = Color.Transparent,
            TextAlign = ContentAlignment.MiddleLeft
        };

    private Button MakeButton(string text, bool primary, int width)
    {
        var button = new Button
        {
            Text = text,
            Width = width,
            Height = 40,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI Semibold", 8.5F),
            ForeColor = primary ? Color.FromArgb(7, 22, 29) : _inkColor,
            BackColor = primary ? _accentColor : _surfaceColor,
            Margin = new Padding(0, 0, 7, 0),
            Cursor = Cursors.Hand,
            UseVisualStyleBackColor = false,
            Tag = primary ? "primary" : null
        };
        button.FlatAppearance.BorderColor = primary ? _accentColor : _borderColor;
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.MouseOverBackColor = primary
            ? ControlPaint.Light(_accentColor, 0.12F)
            : Color.FromArgb(31, 44, 63);
        button.FlatAppearance.MouseDownBackColor = Color.FromArgb(35, 67, 82);
        return button;
    }

    private void ShowShortcutDialog()
    {
        var dialog = new Form
        {
            Text = "AlgoTimer shortcuts",
            ClientSize = new Size(390, 365),
            MinimumSize = new Size(406, 404),
            MaximumSize = new Size(406, 404),
            FormBorderStyle = FormBorderStyle.FixedDialog,
            StartPosition = FormStartPosition.CenterParent,
            ShowInTaskbar = false,
            BackColor = _canvasColor,
            Font = Font
        };
        var title = MakeLabel("SYSTEM-WIDE SHORTCUTS", 18, 15, 320, 22, 9F, FontStyle.Bold, _inkColor);
        var explanation = MakeLabel("Works across Windows while AlgoTimer is connected.", 18, 39, 350, 18, 8F, FontStyle.Regular, _mutedColor);
        dialog.Controls.AddRange([title, explanation]);

        var actions = new (string Command, string Title)[]
        {
            ("start-timer", "Start / Resume"),
            ("pause-timer", "Pause"),
            ("record-lap", "Record lap"),
            ("reset-timer", "Reset timer"),
            ("toggle-window", "Show / hide window")
        };
        for (var index = 0; index < actions.Length; index++)
        {
            var (command, actionTitle) = actions[index];
            var row = MakeCard(16, 68 + index * 42, 358, 36);
            var action = MakeLabel(actionTitle, 11, 0, 130, 36, 8.5F, FontStyle.Regular, _inkColor);
            var binding = _settings.Hotkeys.TryGetValue(command, out var configured) && !string.IsNullOrWhiteSpace(configured)
                ? configured.Replace("+", " + ", StringComparison.Ordinal)
                : "Off";
            var keyLabel = MakeLabel(binding, 143, 0, 138, 36, 8F, FontStyle.Bold, _inkColor);
            keyLabel.TextAlign = ContentAlignment.MiddleRight;
            var isConfigured = binding != "Off";
            var isRegistered = _registeredHotkeys.TryGetValue(command, out var registered) && registered;
            var stateText = !isConfigured ? "OFF" : isRegistered ? "ACTIVE" : "UNAVAILABLE";
            var stateColor = !isConfigured ? _mutedColor : isRegistered ? _accentColor : Color.FromArgb(255, 133, 133);
            var state = MakeLabel(stateText, 284, 0, 66, 36, 6.5F, FontStyle.Bold, stateColor);
            state.TextAlign = ContentAlignment.MiddleRight;
            row.Controls.AddRange([action, keyLabel, state]);
            dialog.Controls.Add(row);
        }

        var help = MakeLabel("Edit bindings in the settings file, then reload AlgoTimer in Chrome.", 18, 284, 355, 30, 7.5F, FontStyle.Regular, _mutedColor);
        var editButton = MakeButton("Edit shortcut settings", false, 154);
        editButton.Location = new Point(18, 322);
        editButton.Height = 30;
        editButton.Click += (_, _) =>
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
                dialog.Close();
            }
            catch (Exception error)
            {
                help.Text = $"Could not open settings: {error.Message}";
            }
        };
        var closeButton = MakeButton("Done", false, 76);
        closeButton.Location = new Point(298, 322);
        closeButton.Height = 30;
        closeButton.Click += (_, _) => dialog.Close();
        dialog.Controls.AddRange([help, editButton, closeButton]);
        dialog.ShowDialog(this);
        dialog.Dispose();
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
            _status.Text = "WAITING FOR TIMER STATE FROM CHROME";
            _status.ForeColor = _mutedColor;
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
        _status.Text = $"{(anyRunning ? "Running" : status)} | {mode switch { "dual" => "Dual timers", "timer" => "Target timer", _ => "Stopwatch" }}";
        _status.ForeColor = anyRunning ? _statusAccentColor : _mutedColor;
        _runButton.Text = anyRunning ? "Pause" : "Start / Resume";

        if (mode == "dual")
        {
            _clock.Font = _dualClockFont;
            _clock.Text = FormatDuration(swElapsed);
            _secondaryClock.Text = $"STOPWATCH ELAPSED  |  TARGET {FormatDuration(remaining)} REMAINING";
        }
        else if (mode == "timer")
        {
            _clock.Font = _singleClockFont;
            _clock.Text = FormatDuration(remaining);
            _secondaryClock.Text = $"TARGET COUNTDOWN  |  {FormatDuration(duration)} TOTAL";
        }
        else
        {
            _clock.Font = _singleClockFont;
            _clock.Text = FormatDuration(swElapsed);
            _secondaryClock.Text = $"STOPWATCH  |  {GetNumber(state, "laps", 0)} LAPS";
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
            ? "Always on top | pinned to the selected display corner"
            : "Always on top | drag to move, release near a corner to snap";
        SettingsChanged?.Invoke();
    }

    private void UpdatePinLabel()
    {
        _pinButton.Text = _settings.Pinned ? "Pinned" : "Pin corner";
        _pinButton.BackColor = _settings.Pinned ? _accentSoftColor : _surfaceColor;
        _pinButton.ForeColor = _settings.Pinned ? _accentColor : _inkColor;
        _pinButton.FlatAppearance.BorderColor = _settings.Pinned ? _accentColor : _borderColor;
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
        var nearest = corners.OrderBy(point => Distance(Left, Top, point.Item2, point.Item3)).First();
        var distance = Distance(Left, Top, nearest.Item2, nearest.Item3);
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

    private static double Distance(int x1, int y1, int x2, int y2)
    {
        var dx = Math.Abs((double)x1 - x2);
        var dy = Math.Abs((double)y1 - y2);
        var max = Math.Max(dx, dy);
        if (max == 0) return 0;

        var ratio = Math.Min(dx, dy) / max;
        return max * Math.Sqrt(1 + ratio * ratio);
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

    private sealed class RoundedPanel : Panel
    {
        private Color _fillColor = Color.FromArgb(20, 29, 43);
        private Color _borderColor = Color.FromArgb(39, 53, 72);

        public int Radius { get; set; } = 10;

        public RoundedPanel()
        {
            DoubleBuffered = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint, true);
        }

        public void SetColors(Color fill, Color border)
        {
            _fillColor = fill;
            _borderColor = border;
            Invalidate();
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            var bounds = new Rectangle(0, 0, Math.Max(0, Width - 1), Math.Max(0, Height - 1));
            using var path = CreateRoundedPath(bounds, Radius);
            using var fill = new SolidBrush(_fillColor);
            using var border = new Pen(_borderColor);
            e.Graphics.FillPath(fill, path);
            e.Graphics.DrawPath(border, path);
        }

        private static System.Drawing.Drawing2D.GraphicsPath CreateRoundedPath(Rectangle bounds, int radius)
        {
            var path = new System.Drawing.Drawing2D.GraphicsPath();
            var diameter = Math.Min(radius * 2, Math.Min(bounds.Width, bounds.Height));
            if (diameter <= 0)
            {
                path.AddRectangle(bounds);
                return path;
            }

            path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
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
