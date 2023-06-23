import fs from 'fs';
import readline from 'readline';

enum Delimeter {
  COMMA = ',',
  SEMICOLON = ';',
  TAB = '\t',
  BAR = '|',
}

class ParserService {
  source: string;
  output: string;
  delimiter?: Delimeter;

  constructor(source: string, output: string, delimiter?: Delimeter) {
    this.source = source;
    this.output = output;
    this.delimiter = delimiter;
  }

  csvToJson() {
    return new Promise((resolve, reject) => {
      let isFirstLine = true; // to handle first line as headers
      let headers: string[] = []; // buffer to store headers
      let divider = ''; // divider to separate json objects

      const readStream = fs.createReadStream(this.source);
      const writeStream = fs.createWriteStream(this.output);

      // start writing json array
      writeStream.write('[' + '\n');

      const readlineInterface = readline.createInterface({
        input: readStream,
      });

      readlineInterface.on('line', (line) => {
        if (isFirstLine) {
          if (!this.delimiter) {
            this.delimiter = this.detectCsvDelimiterByLine(line);
          }

          // parse and save headers
          headers = line.split(this.delimiter);
          isFirstLine = false;
        } else {
          const columns = line.split(this.delimiter as Delimeter);
          const obj = headers.reduce((acc, header, index) => {
            acc[header] = columns[index];

            return acc;
          }, {});

          const json = JSON.stringify(obj, null, '\t');
          const strings = json.split('\n');

          // write json object divider
          writeStream.write(divider);

          // write json object by lines
          strings.forEach((string, index) => {
            writeStream.write(`\t${string}${strings.length - 1 === index ? '' : '\n'}`);
          });

          // set divider to separate json objects
          if (!divider) {
            divider = ',\n';
          }
        }
      });

      readlineInterface.on('close', () => {
        // close json array
        writeStream.write('\n]');

        resolve('done');
      });

      readlineInterface.on('error', (error) => {
        reject(error);
      });
    });
  }

  private detectCsvDelimiterByLine(line: string): Delimeter {
    const delimiters: Delimeter[] = Object.values(Delimeter) as Delimeter[];

    const delimiterCounts = delimiters.map((delimiter: string) => {
      return line.split(delimiter).length;
    });

    const maxDelimiterCount = Math.max(...delimiterCounts);
    const maxDelimiterIndex = delimiterCounts.indexOf(maxDelimiterCount);

    return delimiters[maxDelimiterIndex] || Delimeter.COMMA;
  }
}

export default ParserService;
