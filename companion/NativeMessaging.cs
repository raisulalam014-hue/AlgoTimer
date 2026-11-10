using System.Buffers.Binary;
using System.Text.Json;

namespace AlgoTimer.Companion;

internal static class NativeMessaging
{
    private const int MaxMessageLength = 1024 * 1024;
    private static readonly object OutputLock = new();

    public static void Write(object message)
    {
        var payload = JsonSerializer.SerializeToUtf8Bytes(message);
        if (payload.Length > MaxMessageLength) return;

        Span<byte> header = stackalloc byte[4];
        BinaryPrimitives.WriteInt32LittleEndian(header, payload.Length);
        lock (OutputLock)
        {
            var output = Console.OpenStandardOutput();
            output.Write(header);
            output.Write(payload);
            output.Flush();
        }
    }

    public static void ReadLoop(Action<JsonElement> onMessage, Action onDisconnect)
    {
        try
        {
            using var input = Console.OpenStandardInput();
            var header = new byte[4];
            while (ReadExactly(input, header, allowEof: true))
            {
                var length = BinaryPrimitives.ReadInt32LittleEndian(header);
                if (length is <= 0 or > MaxMessageLength) break;

                var payload = new byte[length];
                if (!ReadExactly(input, payload, allowEof: false)) break;
                using var document = JsonDocument.Parse(payload);
                onMessage(document.RootElement.Clone());
            }
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"AlgoTimer native messaging failed: {error.Message}");
        }
        finally
        {
            onDisconnect();
        }
    }

    private static bool ReadExactly(Stream stream, byte[] buffer, bool allowEof)
    {
        var offset = 0;
        while (offset < buffer.Length)
        {
            var read = stream.Read(buffer, offset, buffer.Length - offset);
            if (read == 0) return allowEof && offset == 0 ? false : throw new EndOfStreamException();
            offset += read;
        }
        return true;
    }
}
