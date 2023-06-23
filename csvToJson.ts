import fs from 'fs';
import dotenv from 'dotenv';
import yargs from 'yargs';

import { ParserService, GoogleDriveService } from './src/index';

const args = yargs(process.argv).parse();

const { resultFile, separator, sourceFile } = args;

if (!resultFile || !sourceFile) {
  console.log('Please provide source and result file names!');
  process.exit(1);
}

dotenv.config();
const driveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const driveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const driveRedirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || '';
const driveRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

const tempPath = 'temp.json';
const folderName = 'ParsedFiles';

(async () => {
  try {
    const parserService = new ParserService(sourceFile, tempPath, separator);

    console.log('Parsing CSV to JSON...');
    await parserService
      .csvToJson()
      .then(() => {
        console.log('Parsing completed!');
      })
      .catch(() => {
        throw new Error('Parsing failed!');
      });

    const googleDriveService = new GoogleDriveService(driveClientId, driveClientSecret, driveRedirectUri, driveRefreshToken);

    if (!fs.existsSync(tempPath)) {
      throw new Error('File not found!');
    }

    let folder = await googleDriveService.searchFolder(folderName).catch((error) => {
      console.error(error);
      return null;
    });

    if (!folder) {
      folder = await googleDriveService
        .createFolder(folderName)
        .then((response) => {
          console.log('Folder created successfully!');
          return response;
        })
        .catch(() => {
          throw new Error('Folder creation failed!');
        });
    }

    await googleDriveService
      .saveFile(resultFile, tempPath, 'image/jpg', folder.id)
      .then(() => {
        console.log('File uploaded successfully!');
      })
      .catch(() => {
        throw new Error('File upload failed!');
      });

    fs.unlinkSync(tempPath);
  } catch (error) {
    console.error(error);
  }
})();
