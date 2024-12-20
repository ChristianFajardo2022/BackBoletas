const { google } = require('googleapis');

// Initializes the Google APIs client library and sets up the authentication using service account credentials.
const auth = new google.auth.GoogleAuth({
    keyFile: './googleSheetGranActo.json',  // Path to your service account key file.
    scopes: ['https://www.googleapis.com/auth/spreadsheets']  // Scope for Google Sheets API.
});

// Asynchronous function to write data to a Google Sheet.
async function writeToSheet(values) {
    const sheets = google.sheets({ version: 'v4', auth });  // Creates a Sheets API client instance.
    const spreadsheetId = '1Y9Ad5KQ0nx1Tinseve3s__YLkdCw6zjjwRUv3IVpaO0';  // The ID of the spreadsheet.
    const range = 'Hoja 1!A1';  // The range in the sheet where data will be written.
    const valueInputOption = 'USER_ENTERED';  // How input data should be interpreted.

    const resource = { values };  // The data to be written.

    try {
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId, range, valueInputOption, resource
        })
        return res;  // Returns the response from the Sheets API.
    } catch (error) {
        console.error('error', error);  // Logs errors.
    }
}

 

// Immediately-invoked function expression (IIFE) to execute the read and write operations.
(async () => {
    const writer = await writeToSheet([['Name', 'Age', 'Location'], ['Ado', 33, 'Miami'], ['Pepe', 21, 'Singapore'], ['Juan', 32, 'Mexico']]);
    console.log(writer);  // Logs the write operation's response.

   //const data = await readSheet();  // Reads data from the sheet.
    //console.log(data);  // Logs the read data.
})();