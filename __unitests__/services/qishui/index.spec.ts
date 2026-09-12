import { parseQishuiPlaylist, parseQishuiPlaylistFromRouterData } from '@/services/qishui'

describe('services/qishui', () => {
  const sampleHtml = `<!DOCTYPE html><html><body><div id="root"></div>
<script>
_ROUTER_DATA = {"loaderData":{"playlist_layout":null,"playlist_page":{"medias":[
  {"id":"1","type":"track","entity":{"track":{"name":"绝（宁愿滞留在此处）","album":{"name":"绝（宁愿滞留在此处）"},"artists":[{"name":"南木碎碎唱"}]}}},
  {"id":"2","type":"track","entity":{"track":{"name":"谁明浪子心","album":{"name":"Giving"},"artists":[{"name":"王杰"},{"name":"赵学而"}]}}},
  {"id":"3","type":"video","entity":{"video":{"title":"U Make Me Wanna - Dance Version","artists":[{"name":"Blue"}]}}},
  {"id":"4","type":"video","entity":{"video":{"title":"AR Stand Up","artists":[{"user_info":{"nickname":"Samson.Lee"}}]}}}
],"playlistInfo":{}}}};
</script></body></html>`

  it('should parse playlist items from embedded _ROUTER_DATA', () => {
    const playlist = parseQishuiPlaylistFromRouterData(sampleHtml)

    expect(playlist).toEqual([
      ['绝（宁愿滞留在此处）', '南木碎碎唱 • 绝（宁愿滞留在此处）'],
      ['谁明浪子心', '王杰, 赵学而 • Giving'],
      ['U Make Me Wanna - Dance Version', 'Blue'],
      ['AR Stand Up', 'Samson.Lee'],
    ])
  })

  it('should prefer _ROUTER_DATA when parsing playlist HTML', () => {
    const playlist = parseQishuiPlaylist(sampleHtml)

    expect(playlist).toHaveLength(4)
    expect(playlist[0]).toEqual(['绝（宁愿滞留在此处）', '南木碎碎唱 • 绝（宁愿滞留在此处）'])
  })

  it('should return null when _ROUTER_DATA is missing', () => {
    expect(parseQishuiPlaylistFromRouterData('<html></html>')).toBeNull()
  })
})
