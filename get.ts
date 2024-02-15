declare global {
  interface String {
    toNumber(): number;
  }
}

String.prototype.toNumber = function () {
  return Number(this);
};

export async function getWishlist() {
  const SELECTOR = {
    TOTAL_COUNT: "#mainArea .listInfoTotalCount",
    COUNT_PER_PAGE: "#mainArea .stSearchBox01 .stRight:last-child select>option:checked",
    WISHLIST_NAME: "#mainArea .stPullDownList>ul>li.stCurrent>span",
    BOOK_LINKS: "#mainArea .stBoxLine01 .stHeading>a",
    TITLE: "#mainArea .stMainArea .stTitle",
    ISBN: "#mainArea .stLeftArea .stItemData li:last-child",
  } as const;

  const getListPageUrl = (id: string | null, pageNo: string | number) => {
    const url = new URL("https://honto.jp/my/wishlist");
    if (id != null) {
      url.searchParams.set("wantBookByUseListId", id);
    }
    url.searchParams.set("pgno", pageNo.toString());
    return url.toString();
  };

  const getPage = async (url: string | URL) => {
    const res = await fetch(url);
    if (res.status != 200) {
      return null;
    }
    const dom = new DOMParser().parseFromString(await res.text(), "text/html");
    return dom;
  };

  const sleep = (second: number) => {
    return new Promise((resolve) => setTimeout(resolve, second * 1000));
  };

  const download = (data: string, fileName: string) => {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = URL.createObjectURL(new Blob([data], { type: "text/json" }));
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ほし本リストID
  const wishlistId = new URL(location.href).searchParams.get("wantBookByUseListId");

  // ほしい本リスト名称
  const wishlistName = Array.from(document!.querySelector(SELECTOR.WISHLIST_NAME)!.childNodes)
    .find((x) => x.nodeName === "#text")
    ?.textContent ??
    "【リスト名取得失敗】";

  // 総件数
  const totalCount = document!.querySelector<HTMLElement>(SELECTOR.TOTAL_COUNT)?.innerText
    ?.toNumber() ?? 0;
  if (totalCount === 0) {
    throw new Error();
  }

  // ページあたり件数
  const countPerPage = document!.querySelector<HTMLElement>(SELECTOR.COUNT_PER_PAGE)?.innerText
    ?.match(/[0-9]+/)?.[0].toNumber() ?? 0;
  if (countPerPage === 0) {
    throw new Error();
  }

  // 総ページ数
  const totalPageCount = Math.ceil(totalCount / countPerPage);

  const result: {
    title: string;
    isbn: number;
  }[] = [];

  for (let pageNo = 1; pageNo <= totalPageCount; pageNo++) {
    // ウィッシュリスト各ページ リンク取得
    const listPage = await getPage(getListPageUrl(wishlistId, pageNo));
    if (listPage === null) {
      throw new Error();
    }
    const bookLinks = Array.from(listPage.querySelectorAll<HTMLAnchorElement>(SELECTOR.BOOK_LINKS))
      .map((el) => el.href);

    // 個別商品ページ ISBN取得
    for (let i = 0; i < bookLinks.length; i++) {
      const bookPage = await getPage(bookLinks[i]);
      if (bookPage == null) {
        continue;
      }
      // タイトルを取得
      const title = bookPage.querySelector<HTMLElement>(SELECTOR.TITLE)?.innerText
        ?.trim() ?? "【タイトル取得失敗】";
      const isbn = Array.from(bookPage.querySelectorAll<HTMLElement>(SELECTOR.ISBN))
        .find((x) => x.innerText.startsWith("ISBN"))
        ?.innerText?.match(/[0-9-]+/)?.[0]?.replaceAll("-", "")
        ?.toNumber() ??
        0;

      console.debug(
        `[honto-wishlist-dl] (${((pageNo - 1) * countPerPage) + (i + 1)} of ${totalCount}) ${title} / ${isbn}`,
      );

      result.push({ title, isbn });

      await sleep(2);
    }

    await sleep(3);
  }

  // ダウンロードする
  download(
    JSON.stringify(result, null, 2),
    `${(wishlistId == null) ? "default" : `${wishlistId}_${wishlistName}`}.json`,
  );

  return result;
}
