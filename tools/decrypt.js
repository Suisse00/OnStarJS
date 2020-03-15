const path = require("path");
const fs = require("async-file");
const crypto = require("crypto");

async function decrypt() {
    const encryptedJsonFile = await fs.readFile(jsonFile);
    // use the .buffer otherwise we will use a different signature (Array[]) where there is no offset
    const cleanEncryptedJsonFile = Buffer.from(encryptedJsonFile.buffer, 8);

    const aesKey = await getDecryptionKey();
    // must be 0 otherwise the beginning of the decrypted file won't containsthe expected json
    const iv = new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);

    const cryptoInstance = crypto.createDecipheriv("aes-128-cbc", aesKey, iv);

    return Buffer.concat([ cryptoInstance.update(cleanEncryptedJsonFile), cryptoInstance.final() ]);
}

function toInt8(unsignedNumber) {
    const uint8Modulo = 256;
    const uint8ModuloHalf = uint8Modulo / 2;

    return unsignedNumber >= uint8ModuloHalf ? unsignedNumber - uint8Modulo : unsignedNumber;
}


async function getDecryptionKey() {
    const keyFileContent = await fs.readFile(keyFile);

    const startPosition = 111;
    const aesKey = Buffer.alloc(16);

    for (var i = 0; i < aesKey.length; i++) {
        aesKey[i] = Math.abs(Math.floor(Math.sin((Math.abs(toInt8(keyFileContent[startPosition + i]))) / 2.0) * 255.0));
    }

    return aesKey;
}

function printHelp() {
    console.log("Parameters: <--help|<path to a directory with the APK extracted> <file path of the unencrypted json configuration>>");
}

const argv = process.argv.slice(2);

if(argv.includes("--help")) {
    printHelp();

    process.exit(1);
}

if(argv.length === 0
    || argv.length !== 2) {
        console.error("Expected 1 or 2 arguments");

        printHelp();

        process.exit(2);
}

const [ pathAPK, decryptedJsonConfigurationPath ] = argv;

const rawPath = path.join(pathAPK, "res\\raw");
const jsonFile = path.join(rawPath, "connect");
const keyFile  = path.join(rawPath, "ic_onstar_launcher");

decrypt()
.then(result => fs.writeFile(decryptedJsonConfigurationPath, result))
.catch(err => console.error(err));