# export-twitter-following-list

[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-up%20to%20date-green.svg)](https://www.tampermonkey.net/)

**Export your Twitter/X's following/followers list like a breeze.**

The script supports exporting:

轻松导出你的 Twitter/X 关注列表与关注者列表。本脚本支持导出：

- User's following list (用户的正在关注)
- User's followers list (用户的关注者/粉丝)
- List's members list (列表包含的用户)
- List's followers list (关注此列表的用户)

> Introducing my new project [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter), a completely rewritten version of this script, which is a more powerful tool for exporting Twitter data, including tweets, replies, likes, bookmarks, following, followers and more.
>
> 广告：全新脚本 [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 现已发布，不仅支持本脚本的全部功能，还可以导出推文、回复、点赞、书签等更多数据。

## Installation / 安装

1. Install the browser extension [Tampermonkey](https://www.tampermonkey.net/) (安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/))
2. Click [here](https://raw.githubusercontent.com/prinsss/export-twitter-following-list/master/export-twitter-following-list.user.js) to install the user script (点击 [安装用户脚本](https://raw.githubusercontent.com/prinsss/export-twitter-following-list/master/export-twitter-following-list.user.js))

## Usage / 使用

Once the user script is installed, navigate to your following list and you will see a floating panel on the left side of the page:

脚本安装完成后，进入你的用户关注页面，可以看到左侧的悬浮面板：

![01-user-interface](https://github.com/prinsss/export-twitter-following-list/raw/master/screenshots/01-user-interface.png)

The control panel will automatically show on supported pages and will hide otherwise. You can not only export following/followers list of yourself but also export for other users.

当你进入支持导出的页面时，控制面板会自动打开，在其他页面则会自动隐藏。你不仅可以导出自己的关注/关注者列表，还可以导出其他人的关注/关注者列表。

Click "Start" button to start extracting data from current list. The active list container will be decorated with a blue border.

点击「Start」按钮开始从当前列表中提取信息，当前正在操作的列表会有蓝色边框提示。

![02-start-listening](https://github.com/prinsss/export-twitter-following-list/raw/master/screenshots/02-start-listening.png)

Since we are using an different approach by leveraging the Web API of Twitter itself, instead of the official programmatic API, we need to make sure that Twitter loaded enough data for the list to be exported completely.

我们与传统类似工具不同，使用的是 Twitter 自身的 Web API 来获取关注列表，而非其官方的开发者 API。因此，你需要保证 Twitter 自身加载完了列表的全部内容，这样最终导出的列表才是完整的。

When you scroll down the page, Twitter will lazy-load the list data and the script will intercept it and save the API responses to a local database. The items saved to the memory is marked as "✅" on the list, with a number indicating its sorting index.

当你往下滚动页面时，Twitter 会以瀑布流的形式不断加载剩余的列表。此脚本会监听相关的 API 调用，并将 API 响应保存至浏览器的本地数据库。已经保存的列表内容会使用「✅」标记出来，后面的数字代表了其在这个列表中的排列顺序。

Keep scrolling down until the end of the list, and "Saved count" number on the control panel should matches the list length.

随后，持续向下滚动页面，直到到达列表底端。此时控制面板中显示的「Saved count」已保存数量应该与列表长度相同。

![03-preview-modal](https://github.com/prinsss/export-twitter-following-list/raw/master/screenshots/03-preview-modal.png)

Click "Preview" button will show a table of currently saved list content in memory. If you are okay with it, click "Export as CSV/JSON/HTML" to download an archive file.

点击「Preview」按钮即可以表格形式预览当前已经暂存的列表数据。如果没问题，点击「Export as」按钮即可导出 CSV/JSON/HTML 格式的列表归档数据。

> Tips: The user data retrieved from API responses is persisted in browser's IndexedDB. Open your browser's DevTools or use the "Dump Database" button to inspect it.
>
> 小提示：从 API 响应中保存的用户数据都持久化存储在浏览器的 IndexedDB 中。你可以使用浏览器的开发者工具，或者控制面板的「Dump Database」按钮来查看数据库的内容。

## FAQ / 常见问题

Q: What about privacy?<br>
A: Everything is processed on your local browser. No data is sent to the cloud.

Q: Why do you build this?<br>
A: For archival usage. Twitter's archive only contains the numeric user ID of your following/followers which is not human-readable.

Q: What's the difference between this and other alternatives?<br>
A: You don't need a developer account for accessing the Twitter API. You don't need to send your personal data to someone's server. The script is completely free and open-source.

Q: The script does not work!<br>
A: A platform upgrade will possibly breaks the script's functionality. Please file an [issue](https://github.com/prinsss/export-twitter-following-list/issues) if you encountered any problem.

Q: 这个脚本如何处理隐私数据？<br>
A: 所有数据都在你的本地浏览器中处理完成，不会被发送到云端。

Q: 你开发这个脚本的原因是？<br>
A: 为了个人存档使用。Twitter 官方的归档功能只包含了关注列表和关注者的数字用户 ID，人类根本不可读。

Q: 这个脚本与其他类似工具有什么区别？<br>
A: 无需注册 Twitter 开发者账号；无需将个人数据上传至第三方服务器；完全免费开源。

Q: 脚本无法正常工作！<br>
A: 平台的升级改动可能会导致此脚本的功能失效。如果你遇到任何问题，请提交 [issue](https://github.com/prinsss/export-twitter-following-list/issues) 反馈。

## License / 开源许可

MIT
