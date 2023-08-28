// Copyright (c) Umbraco.
// See LICENSE for more details.

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Umbraco.Cms.Core.Models.Blocks;

public class BlockValue
{
    [JsonProperty("layout")]
    public IDictionary<string, JToken> Layout { get; set; } = null!;

    [JsonProperty("contentData")]
    public List<BlockItemData> ContentData { get; set; } = new();

    [JsonProperty("settingsData")]
    public List<BlockItemData> SettingsData { get; set; } = new();
}

//todo global elements, probably rename and move somewhere else
public class BlockValueWithoutElements
{
    [JsonProperty("layout")]
    public IDictionary<string, JToken> Layout { get; set; } = null!;

    [JsonProperty("settingsData")]
    public List<BlockItemData> SettingsData { get; set; } = new();

    public BlockValueWithoutElements() { }

    public BlockValueWithoutElements(BlockValue value)
    {
        Layout = value.Layout;
        SettingsData = value.SettingsData;
    }
}
