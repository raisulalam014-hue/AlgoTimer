using System.Text.Json;

namespace AlgoTimer.Companion;

internal sealed class CompanionSettings
{
    public Dictionary<string, string> Hotkeys { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["start-timer"] = "Ctrl+Alt+1",
        ["pause-timer"] = "Ctrl+Alt+2",
        ["record-lap"] = "Ctrl+Alt+3",
        ["reset-timer"] = "Ctrl+Alt+4",
        ["toggle-window"] = "Ctrl+Alt+5"
    };

    public bool Pinned { get; set; }
    public string Corner { get; set; } = "top-right";
    public string? ScreenDevice { get; set; }
    public int? Left { get; set; }
    public int? Top { get; set; }

    public static string FilePath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "AlgoTimer",
        "companion.settings.json");

    public static CompanionSettings Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return new CompanionSettings();
            var loaded = JsonSerializer.Deserialize<CompanionSettings>(File.ReadAllText(FilePath));
            if (loaded is null) return new CompanionSettings();

            var defaults = new CompanionSettings();
            var configured = loaded.Hotkeys ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            loaded.Hotkeys = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in defaults.Hotkeys)
            {
                loaded.Hotkeys[pair.Key] = configured.TryGetValue(pair.Key, out var value) && !string.IsNullOrWhiteSpace(value)
                    ? value
                    : pair.Value;
            }
            return loaded;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Could not load companion settings: {error.Message}");
            return new CompanionSettings();
        }
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
            File.WriteAllText(FilePath, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Could not save companion settings: {error.Message}");
        }
    }

    public void EnsureSaved()
    {
        if (!File.Exists(FilePath)) Save();
    }
}
