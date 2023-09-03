import Page from '../core/page';
import { Line } from '../core/line';
import { headerFooterDetectionThreshold } from '../global/parameters';
import { Characteristics } from '../global/characteristics';
import Bbox from '../utility/bbox';

export default class header_footer {
  constructor(all_pages: Map<string, Page>) {
    this.pages = Array.from(all_pages.values());
    this.y_margin_array_even = new Array(this.line_window_size);
    this.y_margin_array_odd = new Array(this.line_window_size);
  }

  public Thresholds = new headerFooterDetectionThreshold();

  public result: (number | Line)[][][];

  public pages: Page[];

  public list: (number | Line)[][];

  public pixel_error =
    this.Thresholds.headerFooterDetectParameters.get('pixel_error');

  public page_window_size =
    this.Thresholds.headerFooterDetectParameters.get('page_window_size');

  public line_window_size =
    this.Thresholds.headerFooterDetectParameters.get('line_window_size');

  public probable_area =
    this.Thresholds.headerFooterDetectParameters.get('probable_area');

  public num_match =
    this.Thresholds.headerFooterDetectParameters.get('num_match');

  public justification_closeness =
    this.Thresholds.headerFooterDetectParameters.get('justification_closeness');

  public y_margin_array_odd: any[];

  public y_margin_array_even: any[];

  private characteristics: Characteristics = new Characteristics();

  private headerInfo: {
    bbox: Map<number, Bbox[]>;
    content: Map<number, string[]>;
  } = {
    bbox: undefined,
    content: undefined
  };

  private footerInfo: {
    bbox: Map<number, Bbox[]>;
    content: Map<number, string[]>;
  } = {
    bbox: undefined,
    content: undefined
  };

  private pageNumInfo: {
    pageNumHorizontalPosition: Map<number, number>;
    pageNumVerticalPosition: Map<number, number>;
  } = {
    pageNumHorizontalPosition: undefined,
    pageNumVerticalPosition: undefined
  };

  public find_justification(input_line: Line, input_page: Page) {
    const x_margin_left = input_line.bbox.minX,
      x_margin_right = input_page.width - input_line.bbox.maxX;
    let position;
    const diff = x_margin_left - x_margin_right;
    if (Math.abs(diff) < this.justification_closeness * input_page.width) {
      position = 1;
    } else if (x_margin_left > x_margin_right) {
      position = 2;
    } else {
      position = 0;
    }
    return position;
  }

  public find_page_number(line_1: Line, line_2: Line, i: number, j: number) {
    let page_number = -1,
      numbers_i,
      numbers_j;
    const line_text_i = line_1.all_text(),
      numbers_ii = line_text_i.match(/\d+/g);

    if (numbers_ii) {
      numbers_i = numbers_ii.map(Number);
    }
    const line_text_j = line_2.all_text(),
      numbers_jj = line_text_j.match(/\d+/g);
    if (numbers_jj) {
      numbers_j = numbers_jj.map(Number);
    }

    if (numbers_ii && numbers_jj) {
      for (let x = 0; x < numbers_i.length; x++) {
        for (let y = 0; y < numbers_j.length; y++) {
          if (numbers_i[x] == numbers_j[y]) {
            numbers_i[x] = -1;
            numbers_j[y] = -1;
            break;
          }
        }
      }
      for (let x = 0; x < numbers_i.length; x++) {
        for (let y = 0; y < numbers_j.length; y++) {
          if (
            numbers_i[x] == numbers_j[y] + i - j &&
            numbers_i[x] != -1 &&
            numbers_j[y] != -1
          ) {
            page_number = numbers_i[x];
            break;
          }
        }
      }
    }

    if (page_number != -1) {
      this.characteristics.pageNumPresence = true;
    }

    return page_number;
  }

  public are_lines_equal(
    line_1: Line,
    line_2: Line,
    do_not_include_numeric_value = true
  ) {
    if (line_1 == undefined || line_2 == undefined) {
      return false;
    }
    const line_text_i = line_1.all_text(),
      line_text1_i = line_text_i.replace(/\d/g, ''),
      line_text2_i = line_text1_i.trim(),
      line_text_j = line_2.all_text(),
      line_text1_j = line_text_j.replace(/\d/g, ''),
      line_text2_j = line_text1_j.trim();
    if (do_not_include_numeric_value == true) {
      if (line_text2_i == line_text2_j) {
        return true;
      }
      return false;
    }

    if (line_text_i == line_text_j) {
      return true;
    }
    return false;
  }

  public stage_1(run_for_footer = false) {
    let { num_match } = this;
    this.result = [];
    this.list = [];
    let i, index, j;
    for (i = this.pages.length - 1; i >= 0; i--) {
      let found_flag = 0,
        page_number = -1;

      for (index = 0; index < this.line_window_size; index++) {
        num_match = this.num_match;
        const line_1 = run_for_footer
          ? this.pages[i].all_lines()[
              this.pages[i].all_lines().length - 1 - index
            ]
          : this.pages[i].all_lines()[index];
        let y_margin_min, y_margin_max;
        if (line_1 != undefined) {
          y_margin_min = line_1.bbox.minY;
          y_margin_max = line_1.bbox.maxY;
        }

        for (
          j = i - this.page_window_size < 0 ? i % 2 : i - this.page_window_size;
          j <=
          (i + this.page_window_size > this.pages.length - 1
            ? this.pages.length - 1 - ((this.pages.length - 1 + i) % 2)
            : i + this.page_window_size);
          j += 2
        ) {
          if (j != i) {
            const line_2 = run_for_footer
              ? this.pages[j].all_lines()[
                  this.pages[j].all_lines().length - 1 - index
                ]
              : this.pages[j].all_lines()[index];
            if (this.are_lines_equal(line_1, line_2)) {
              if (page_number == -1) {
                page_number = this.find_page_number(line_1, line_2, i, j);
              }

              if (i % 2) {
                if (this.y_margin_array_odd[index][0] == -1) {
                  this.y_margin_array_odd[index][0] = y_margin_min;
                  this.y_margin_array_odd[index][1] = y_margin_max;
                }
                if (
                  y_margin_min <
                    this.y_margin_array_odd[index][0] + this.pixel_error &&
                  y_margin_min >
                    this.y_margin_array_odd[index][0] - this.pixel_error &&
                  y_margin_max <
                    this.y_margin_array_odd[index][1] + this.pixel_error &&
                  y_margin_max >
                    this.y_margin_array_odd[index][1] - this.pixel_error
                ) {
                  num_match--;
                }
              } else {
                if (this.y_margin_array_even[index][0] == -1) {
                  this.y_margin_array_even[index][0] = y_margin_min;
                  this.y_margin_array_even[index][1] = y_margin_max;
                }

                if (
                  y_margin_min <
                    this.y_margin_array_even[index][0] + this.pixel_error &&
                  y_margin_min >
                    this.y_margin_array_even[index][0] - this.pixel_error &&
                  y_margin_max <
                    this.y_margin_array_even[index][1] + this.pixel_error &&
                  y_margin_max >
                    this.y_margin_array_even[index][1] - this.pixel_error
                ) {
                  num_match--;
                }
              }
              if (num_match <= 0) {
                if (run_for_footer == false) {
                  this.characteristics.headerPresence = true;
                  if (this.headerInfo.bbox.has(i) == false) {
                    this.headerInfo.content.set(i, [
                      line_1
                        .all_text()
                        .replace(
                          page_number == -1 ? '' : page_number.toString(),
                          ''
                        )
                    ]);
                    this.headerInfo.bbox.set(i, [line_1.bbox]);
                  } else {
                    this.headerInfo.content
                      .get(i)
                      .push(
                        line_1
                          .all_text()
                          .replace(
                            page_number == -1 ? '' : page_number.toString(),
                            ''
                          )
                      );
                    this.headerInfo.bbox.get(i).push(line_1.bbox);
                  }
                } else {
                  this.characteristics.footerPresence = true;
                  if (this.footerInfo.bbox.has(i) == false) {
                    this.footerInfo.bbox.set(i, [line_1.bbox]);
                    this.footerInfo.content.set(i, [
                      line_1
                        .all_text()
                        .replace(
                          page_number == -1 ? '' : page_number.toString(),
                          ''
                        )
                    ]);
                  } else {
                    this.footerInfo.bbox.get(i).push(line_1.bbox);
                    this.footerInfo.content
                      .get(i)
                      .push(
                        line_1
                          .all_text()
                          .replace(
                            page_number == -1 ? '' : page_number.toString(),
                            ''
                          )
                      );
                  }
                }
                this.list.push([
                  i,
                  line_1,
                  page_number,
                  this.find_justification(line_1, this.pages[i])
                ]);
                if (page_number != -1) {
                  this.characteristics.pageNumPresence = true;
                  this.pageNumInfo.pageNumHorizontalPosition.set(
                    i,
                    this.find_justification(line_1, this.pages[i])
                  );
                  this.pageNumInfo.pageNumVerticalPosition.set(
                    i,
                    run_for_footer ? 1 : 0
                  );
                }
                found_flag = 1;
                break;
              }
            }
          }
        }
      }

      if (found_flag == 0 && i == 0 && run_for_footer == true) {
        const bottom_line =
          this.pages[i].all_lines()[this.pages[i].all_lines().length - 1];
        if (bottom_line.all_text().trim() == '1') {
          this.characteristics.footerPresence = true;
          this.characteristics.pageNumPresence = true;
          if (this.footerInfo.bbox.has(i) == false) {
            this.footerInfo.bbox.set(i, [bottom_line.bbox]);
          } else {
            this.headerInfo.bbox.get(i).push(bottom_line.bbox);
          }

          this.pageNumInfo.pageNumHorizontalPosition.set(
            i,
            this.find_justification(bottom_line, this.pages[i])
          );
          this.pageNumInfo.pageNumVerticalPosition.set(i, 1);

          this.list.push([
            i,
            bottom_line,
            1,
            this.find_justification(bottom_line, this.pages[i])
          ]);
        }
      }
      this.result.push(this.list);
      this.list = [];
    }
  }

  public stage_2(i = 0, run_for_footer = false) {
    let flag_1 = 0,
      indd = 0,
      temp_index;
    const x = this.pages[i].all_lines(),
      fontSize = x[i].font_size();

    for (temp_index = 1; temp_index < x.length; temp_index++) {
      if (
        fontSize > x[temp_index].font_size() ||
        this.pages[i].height * this.probable_area < x[temp_index].bbox.maxY
      ) {
        break;
      } else if (fontSize < x[temp_index].font_size()) {
        flag_1 = 1;
        indd = temp_index - 1;
        break;
      }
    }
    if (flag_1 == 1) {
      let index_1;
      for (index_1 = 0; index_1 <= indd; index_1++) {
        if (run_for_footer == false) {
          this.characteristics.headerPresence = true;
          if (this.headerInfo.bbox.has(i) == false) {
            this.headerInfo.content.set(i, [x[index_1].all_text()]);
            this.headerInfo.bbox.set(i, [x[index_1].bbox]);
          } else {
            this.headerInfo.content.get(i).push(x[index_1].all_text());
            this.headerInfo.bbox.get(i).push(x[index_1].bbox);
          }
        } else {
          this.characteristics.footerPresence = true;
          if (this.footerInfo.bbox.has(i) == false) {
            this.footerInfo.bbox.set(i, [x[index_1].bbox]);
            this.footerInfo.content.set(i, [x[index_1].all_text()]);
          } else {
            this.footerInfo.bbox.get(i).push(x[index_1].bbox);
            this.footerInfo.content.get(i).push(x[index_1].all_text());
          }
        }
        this.list.push([
          i,
          x[index_1],
          -1,
          this.find_justification(x[index_1], this.pages[i])
        ]);
      }
    }
  }

  public find_roman_page_num(run_for_footer = false) {
    const roman_numerals_list = [
      'i',
      'ii',
      'iii',
      'iv',
      'v',
      'vi',
      'vii',
      'viii',
      'ix',
      'x',
      'xi',
      'xii',
      'xiii',
      'xiv',
      'xv',
      'xvi',
      'xvii',
      'xviii',
      'xix',
      'xx',
      'xxi',
      'xxii',
      'xxiii',
      'xxiv',
      'xxv',
      'xxvi',
      'xxvii',
      'xxviii',
      'xxix',
      'xxx'
    ];
    for (let i = this.pages.length - 1; i >= 0; i--) {
      let index,
        page_number = -1,
        num_match = 1;
      for (index = 0; index < this.line_window_size; index++) {
        num_match = 1;
        console.log('PAGE LINES: ', this.pages[i].all_lines());
        const /*x_margin_left = run_for_footer
            ? this.pages[i].all_lines()[
                this.pages[i].all_lines().length - 1 - index
              ].bbox.minX
            : this.pages[i].all_lines()[index].bbox.minX,
          x_margin_right =
            this.pages[i].width -
            (run_for_footer
              ? this.pages[i].all_lines()[
                  this.pages[i].all_lines().length - 1 - index
                ].bbox.maxX
              : this.pages[i].all_lines()[index].bbox.maxX), */
          line_text_i = run_for_footer
            ? this.pages[i]
                .all_lines()
                [this.pages[i].all_lines().length - 1 - index].all_text()
            : this.pages[i].all_lines()[index].all_text(),
          line_text2_i = line_text_i.trim();
        if (!roman_numerals_list.includes(line_text2_i)) {
          continue;
        }
        page_number = roman_numerals_list.indexOf(line_text2_i) + 1;

        for (
          let j =
            i - this.page_window_size < 0 ? i % 2 : i - this.page_window_size;
          j <=
          (i + this.page_window_size > this.pages.length - 1
            ? this.pages.length - 1 - ((this.pages.length - 1 + i) % 2)
            : i + this.page_window_size);
          j += 2
        ) {
          if (j != i) {
            const line_text_j = run_for_footer
                ? this.pages[j]
                    .all_lines()
                    [this.pages[j].all_lines().length - 1 - index].all_text()
                : this.pages[j].all_lines()[index].all_text(),
              line_text2_j = line_text_j.trim();
            if (!roman_numerals_list.includes(line_text2_j)) {
              continue;
            }
            if (
              roman_numerals_list.indexOf(line_text2_i) ==
              roman_numerals_list.indexOf(line_text2_j) + i - j
            ) {
              num_match--;
            }
          }
        }
        if (num_match <= 0) {
          if (page_number != -1) {
            this.characteristics.pageNumPresence = true;
          }
        }
        if (run_for_footer) {
          if (this.footerInfo.bbox.has(i) == false) {
            this.footerInfo.bbox.set(i, [
              this.pages[i].all_lines()[index].bbox
            ]);
            this.footerInfo.content.set(i, [
              this.pages[i]
                .all_lines()
                [index].all_text()
                .replace(page_number == -1 ? '' : page_number.toString(), '')
            ]);
          } else {
            this.footerInfo.bbox
              .get(i)
              .push(this.pages[i].all_lines()[index].bbox);
            this.footerInfo.content.get(i).push(
              this.pages[i]
                .all_lines()
                [index].all_text()
                .replace(page_number == -1 ? '' : page_number.toString(), '')
            );
          }

          this.result[this.pages.length - 1 - i].push([
            i,
            this.pages[i].all_lines()[
              this.pages[i].all_lines().length - 1 - index
            ],
            page_number,
            this.find_justification(
              this.pages[i].all_lines()[
                this.pages[i].all_lines().length - 1 - index
              ],
              this.pages[i]
            )
          ]);
        } else {
          if (this.headerInfo.bbox.has(i) == false) {
            this.headerInfo.content.set(i, [
              this.pages[i]
                .all_lines()
                [index].all_text()
                .replace(page_number == -1 ? '' : page_number.toString(), '')
            ]);
            this.headerInfo.bbox.set(i, [
              this.pages[i].all_lines()[index].bbox
            ]);
          } else {
            this.headerInfo.content.get(i).push(
              this.pages[i]
                .all_lines()
                [index].all_text()
                .replace(page_number == -1 ? '' : page_number.toString(), '')
            );
            this.headerInfo.bbox
              .get(i)
              .push(this.pages[i].all_lines()[index].bbox);
          }
          this.result[this.pages.length - 1 - i].push([
            i,
            this.pages[i].all_lines()[index],
            page_number,
            this.find_justification(
              this.pages[i].all_lines()[index],
              this.pages[i]
            )
          ]);
        }

        this.pageNumInfo.pageNumHorizontalPosition.set(
          i,
          this.find_justification(
            this.pages[i].all_lines()[index],
            this.pages[i]
          )
        );
        this.pageNumInfo.pageNumVerticalPosition.set(i, run_for_footer ? 1 : 0);
      }
    }
  }

  public stage_3(run_for_footer = false) {
    let { num_match } = this;
    for (let i = this.pages.length - 1; i >= 0; i--) {
      for (let index = 0; index < this.line_window_size; index++) {
        const line_1 = run_for_footer
          ? this.pages[i].all_lines()[
              this.pages[i].all_lines().length - 1 - index
            ]
          : this.pages[i].all_lines()[index];
        let already_included = 0;
        for (
          let temp = 0;
          temp < this.result[this.pages.length - 1 - i].length;
          temp++
        ) {
          if (this.result[this.pages.length - 1 - i][temp].includes(line_1)) {
            already_included = 1;
          }
        }
        if (already_included == 1) {
          continue;
        }

        num_match = 1;
        const y_margin_min = line_1.bbox.minY,
          y_margin_max = line_1.bbox.maxY;
        if (this.pages.length < 7) {
          if (this.y_margin_array_odd[index][0] != -1) {
            if (
              y_margin_min <
                this.y_margin_array_odd[index][0] + this.pixel_error &&
              y_margin_min >
                this.y_margin_array_odd[index][0] - this.pixel_error &&
              y_margin_max <
                this.y_margin_array_odd[index][1] + this.pixel_error &&
              y_margin_max >
                this.y_margin_array_odd[index][1] - this.pixel_error
            ) {
              num_match--;
            }
          }
          if (this.y_margin_array_even[index][0] != -1) {
            if (
              y_margin_min <
                this.y_margin_array_even[index][0] + this.pixel_error &&
              y_margin_min >
                this.y_margin_array_even[index][0] - this.pixel_error &&
              y_margin_max <
                this.y_margin_array_even[index][1] + this.pixel_error &&
              y_margin_max >
                this.y_margin_array_even[index][1] - this.pixel_error
            ) {
              num_match--;
            }
          }
        } else if (i % 2 && this.y_margin_array_odd[index][0] != -1) {
          if (
            y_margin_min <
              this.y_margin_array_odd[index][0] + this.pixel_error &&
            y_margin_min >
              this.y_margin_array_odd[index][0] - this.pixel_error &&
            y_margin_max <
              this.y_margin_array_odd[index][1] + this.pixel_error &&
            y_margin_max > this.y_margin_array_odd[index][1] - this.pixel_error
          ) {
            num_match--;
          }
        } else if (i % 2 == 0 && this.y_margin_array_even[index][0] != -1) {
          if (
            y_margin_min <
              this.y_margin_array_even[index][0] + this.pixel_error &&
            y_margin_min >
              this.y_margin_array_even[index][0] - this.pixel_error &&
            y_margin_max <
              this.y_margin_array_even[index][1] + this.pixel_error &&
            y_margin_max > this.y_margin_array_even[index][1] - this.pixel_error
          ) {
            num_match--;
          }
        }
        if (num_match <= 0) {
          if (run_for_footer == false) {
            if (this.headerInfo.bbox.has(i) == false) {
              this.headerInfo.content.set(i, [line_1.all_text()]);
              this.headerInfo.bbox.set(i, [line_1.bbox]);
            } else {
              this.headerInfo.content.get(i).push(line_1.all_text());
              this.headerInfo.bbox.get(i).push(line_1.bbox);
            }
          } else if (this.footerInfo.bbox.has(i) == false) {
            this.footerInfo.bbox.set(i, [line_1.bbox]);
            this.footerInfo.content.set(i, [line_1.all_text()]);
          } else {
            this.footerInfo.bbox.get(i).push(line_1.bbox);
            this.footerInfo.content.get(i).push(line_1.all_text());
          }
        }
        this.result[this.pages.length - 1 - i].push([
          i,
          line_1,
          -1,
          this.find_justification(line_1, this.pages[i])
        ]);
      }
    }
  }

  public header_check(): any[] {
    this.characteristics.pageNumPresence = false;
    this.headerInfo.bbox = new Map();
    this.headerInfo.content = new Map();
    this.pageNumInfo.pageNumHorizontalPosition = new Map();
    this.pageNumInfo.pageNumVerticalPosition = new Map();

    for (let x = 0; x < this.line_window_size; ++x) {
      this.y_margin_array_odd[x] = [-1, -1];
    }
    for (let x = 0; x < this.line_window_size; ++x) {
      this.y_margin_array_even[x] = [-1, -1];
    }

    if (this.pages.length < 7) {
      this.num_match = 1;
    }

    this.stage_1();
    //this.find_roman_page_num(); This function has error for some file

    return this.result;
  }

  public footer_check(): any[] {
    this.footerInfo.bbox = new Map();
    this.footerInfo.content = new Map();

    for (let x = 0; x < this.line_window_size; ++x) {
      this.y_margin_array_odd[x] = [-1, -1];
    }
    for (let x = 0; x < this.line_window_size; ++x) {
      this.y_margin_array_even[x] = [-1, -1];
    }

    if (this.pages.length < 7) {
      this.num_match = 1;
    }

    this.stage_1(true);
    //this.find_roman_page_num(true); This function has error for some file

    return this.result;
  }
}
