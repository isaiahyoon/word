import { BOOKS } from "./books.mjs";

export const DEFAULT_EDITION = "kjv";
const CANONICAL_BOOK_ORDER = BOOKS.map((_, index) => index + 1);

export const KRV_BOOK_NAMES = [
  "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "룻기", "사무엘상", "사무엘하", "열왕기상", "열왕기하", "역대상", "역대하", "에스라", "느헤미야", "에스더", "욥기", "시편", "잠언", "전도서", "아가", "이사야", "예레미야", "예레미야애가", "에스겔", "다니엘", "호세아", "요엘", "아모스", "오바댜", "요나", "미가", "나훔", "하박국", "스바냐", "학개", "스가랴", "말라기",
  "마태복음", "마가복음", "누가복음", "요한복음", "사도행전", "로마서", "고린도전서", "고린도후서", "갈라디아서", "에베소서", "빌립보서", "골로새서", "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서", "디도서", "빌레몬서", "히브리서", "야고보서", "베드로전서", "베드로후서", "요한1서", "요한2서", "요한3서", "유다서", "요한계시록",
];

export const EDITIONS = {
  kjv: {
    id: "kjv",
    routeSegment: "kjv",
    label: "KJV · English",
    name: "King James Version",
    brandPrimary: "KING JAMES",
    brandSecondary: "VERSION",
    language: "en",
    direction: "ltr",
    dataPath: "./scripture/kjv",
    bookOrder: CANONICAL_BOOK_ORDER,
    displayBookNames: BOOKS,
  },
  krv: {
    id: "krv",
    routeSegment: "krv",
    label: "KRV · 한국어",
    name: "개역한글 1961",
    brandPrimary: "개역한글",
    brandSecondary: "1961",
    language: "ko",
    direction: "ltr",
    dataPath: "./scripture/krv",
    bookOrder: CANONICAL_BOOK_ORDER,
    displayBookNames: KRV_BOOK_NAMES,
    attribution: "개역한글판 1961 · 대한성서공회",
    attributionUrl: "https://www.bskorea.or.kr/bbs/board.php?bo_table=copyright_faq&wr_id=5",
  },
  diodati: {
    id: "diodati",
    routeSegment: "diodati",
    shortCode: "DIO",
    label: "Diodati · Italiano",
    name: "Giovanni Diodati (1649)",
    brandPrimary: "DIODATI",
    brandSecondary: "ITALIANO · 1649",
    language: "it",
    direction: "ltr",
    dataPath: "./scripture/diodati",
    bookOrder: CANONICAL_BOOK_ORDER,
    themeColor: "#f8e9ee",
    attribution: "Giovanni Diodati 1649 · Public Domain",
    attributionUrl: "https://github.com/FordhamRamFan/public-domain-bible-translations/tree/main/Italian/Diodati-1649",
  },
  japbungo: {
    id: "japbungo",
    routeSegment: "japbungo",
    shortCode: "JAP",
    label: "Bungo-yaku · 日本語",
    name: "Bungo-yaku (文語訳)",
    brandPrimary: "BUNGO-YAKU",
    brandSecondary: "文語訳",
    language: "ja",
    direction: "ltr",
    dataPath: "./scripture/japbungo",
    bookOrder: CANONICAL_BOOK_ORDER,
    themeColor: "#edf5eb",
    attribution: "Bungo-yaku · Meiji-genyaku OT / Taisho-kaiyaku NT",
    attributionUrl: "https://github.com/getbible/v2/tree/master/japbungo",
  },
};

export const EDITION_IDS = Object.keys(EDITIONS);