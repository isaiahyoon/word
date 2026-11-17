// Entries follow the fixed 66-book canon; alternatives are separated by |.
const abbreviations = {
  kjv: `
    Gen|Gn Exod|Ex Lev|Lv Num|Nm Deut|Dt Josh Judges|Jgs Ruth|Ru
    1Sam|1Sm 2Sam|2Sm 1Kgs 2Kgs 1Chron|1Chr 2Chron|2Chr Ezra|Ezr Neh Est Job|Jb
    Ps|Pss Prov|Prv Eccl Song|Sg Isa|Is Jer Lam Ezek|Ez Dan|Dn
    Hos Joel|Jl Amos|Am Obad|Ob Jon Mic|Mi Nah|Na Hab Zeph|Zep Hag|Hg Zech|Zec Mal
    Matt|Mt Mark|Mk Luke|Lk John|Jn Acts Rom 1Cor 2Cor Gal Eph Phil Col
    1Thess|1Thes 2Thess|2Thes 1Tim|1Tm 2Tim|2Tm Titus|Ti Philem|Phlm Heb Jas
    1Pet|1Pt 2Pet|2Pt 1John|1Jn 2John|2Jn 3John|3Jn Jude Rev|Rv
  `,
  krv: `
    창 출 레 민 신 수 삿 룻 삼상 삼하 왕상 왕하 대상 대하 스|라 느 에|더 욥 시 잠 전 아 사 렘 애 겔 단
    호 욜 암 옵 욘 미 나 합 습 학 슥 말 마 막 눅 요 행 롬 고전 고후 갈 엡 빌 골 살전 살후 딤전 딤후
    딛 몬 히 약 벧전 벧후 요일 요이 요삼 유 계
  `,
  japbungo: `
    創 出 レビ 民 申 ヨシュ 士 ルツ サム上 サム下 王上 王下 代上 代下 エズ ネヘ エス ヨブ 詩 箴 コヘ|伝 雅
    イザ エレ 哀 エゼ ダニ ホセ ヨエ アモ オバ ヨナ ミカ ナホ ハバ ゼファ ハガ ゼカ マラ
    マタ マコ ルカ ヨハ 使 ロマ 1コリ 2コリ ガラ エフェ|エペ フィリ|ピリ コロ
    1テサ 2テサ 1テモ 2テモ テト フィレ|ピレ ヘブ ヤコ 1ペト|1ペテ 2ペト|2ペテ
    1ヨハ 2ヨハ 3ヨハ ユダ 黙
  `,
  diodati: `
    Gen|Ge|Gn Eso|Es|Eo Le|Lv Nu|Nm De|Dt Gios|Gs Giudic|Gdc|Gc Ru|Rt
    1Sam|1S 2Sam|2S 1Re|1R 2Re|2R 1Cr 2Cr Esd|Ed Ne Est|Et Giob|Gb
    Sal|Sl Prov|Pr Ec|Qo CC|Ct Is Ger|Gr Lam|La Ez Da|Dn Os Gioe|Gl Am Abd|Ad
    Gion Mi Na Abac|H So Ag Zac Mal|Ml Mat|Mt Mar|Mc|Mr Lu|Lc Giov|Gv At Ro|Rm
    1Co 2Co Ga Ef Fili|Fl Col|Cl 1Te|1Ts 2Te|2Ts 1Ti|1Tm 2Ti|2Tm
    Tit|Tt File|Fm Eb Giac|Gm 1P 2P 1G 2G 3G Giuda|Gd Ap
  `,
  luther1912: `
    Gen|1Mo Ex|2Mo Lev|3Mo Num|4Mo Dtn|5Mo Jos Ri Rut
    1Sam 2Sam 1Kön 2Kön 1Chr 2Chr Esra|Esr Neh Est Hiob|Ijob Ps Spr Pred|Koh Hld
    Jes Jer Klgl Hes|Ez Dan Hos Joel Am Obd Jona Mi Nah Hab Zef Hag Sach Mal
    Mt Mk Lk Joh Apg Röm 1Kor 2Kor Gal Eph Phil Kol 1Thess 2Thess 1Tim 2Tim
    Tit Phlm Hebr Jak 1Petr 2Petr 1Joh 2Joh 3Joh Jud Offb|Off
  `,
  martin1744: `
    Gn|Gen Ex|Exod Lv|Lév Nb|Nom Dt|Deut Js|Jos Jg|Jug Rt|Ru
    1S 2S 1R 2R 1Ch 2Ch Esd Ne|Né Est Jb Ps Pr|Prov Ec|Ecc Ct|Cant
    Es|És Jr|Jé La|Lam Ez|Éz Da|Dn Os Jl Am Ab|Abd Jon Mi Na Ha|Hab So|Soph Ag Za|Zach Ma|Mal
    Mt|Mat Mc|Mar Lc Jn Ac|Act Rm|Rom 1Co 2Co Gal|Ga Eph|Ep Ph|Phil Col
    1Th 2Th 1Ti 2Ti Tt|Tit Phm|Phil Hé|He Jc|Jac 1P|1Pet 2P|2Pet 1Jn 2Jn 3Jn Jd|Jud Ap|Apoc
  `,
  rv1865: `
    Gen|Gn Exo|Ex Lev|Lv Num|Nm Deut|Dt Jos Jue Rut|Rt
    1Sam|1Sm 2Sam|2Sm 1Rey|1Re 2Rey|2Re 1Cro|1Cr 2Cro|2Cr Ezd|Esd Neh Est Job Sal Pro|Pr Ec|Ecl Can|Cnt
    Isa|Is Jer Lam|Lm Eze|Ez Dan|Dn Ose|Os Joe|Jl Amo|Am Abd Jon Mic|Mi Nah Hab Sof Hag Zac Mal
    Mat|Mt Mar|Mc Luc|Lc Jua|Jn Hec|Hch Rom|Ro 1Cor|1Co 2Cor|2Co Gal|Ga Efe|Ef Fil Col
    1Tes|1Ts 2Tes|2Ts 1Tim|1Tm 2Tim|2Tm Tit Flm|Fil Heb Snt|Stg 1Ped|1Pe 2Ped|2Pe
    1Jua|1Jn 2Jua|2Jn 3Jua|3Jn Jud Apo|Ap
  `,
  alm1911: `
    Gen|Gn Ex|Exo Lev|Lv Num|Nm Deut|Dt Jos Jui Rute|Rt
    1Sam|1Sm 2Sam|2Sm 1Re 2Re 1Crôn|1Cr 2Crôn|2Cr Esd Neh Est Jó|Job Sl|Sal Prov Ecl Cânt|Cnt
    Is|Isa Jer Lam|Lm Ez|Eze Dn|Dan Os|Ose Jl|Joe Am|Amo Ob|Abd Jon Miq Na Hab Sof Ag Zac Mal
    Mt|Mat Mc|Mar Lc|Luc Jo|João At Rm|Rom 1Cor|1Co 2Cor|2Co Gál|Ga Ef|Efe Fp|Fil Cl|Col
    1Ts|1Tes 2Ts|2Tes 1Tm|1Tim 2Tm|2Tim Tt|Tit Fm Hb|Heb Tg 1Pe|1Ped 2Pe|2Ped
    1Jo 2Jo 3Jo Jd|Jud Ap|Apo
  `,
};

export const BOOK_ABBREVIATIONS = Object.fromEntries(
  Object.entries(abbreviations).map(([edition, entries]) => [
    edition,
    entries.trim().split(/\s+/u).map((entry) => entry.split("|")),
  ]),
);
