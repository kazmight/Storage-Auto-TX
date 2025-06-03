require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');

const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    bold: "\x1b[1m"
};

const logger = {
    info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    process: (msg) => console.log(`\n${colors.white}[➤] ${msg}${colors.reset}`),
    debug: (msg) => console.log(`${colors.gray}[…] ${msg}${colors.reset}`),
    bye: (msg) => console.log(`${colors.yellow}[…] ${msg}${colors.reset}`),
    critical: (msg) => console.log(`${colors.red}${colors.bold}[❌] ${msg}${colors.reset}`),
    summary: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
    section: (msg) => {
        const line = '='.repeat(50);
        console.log(`\n${colors.cyan}${line}${colors.reset}`);
        if (msg) console.log(`${colors.cyan}${msg}${colors.reset}`);
        console.log(`${colors.cyan}${line}${colors.reset}\n`);
    },
    banner: () => {
        console.log(`${colors.cyan}${colors.bold}`);
        console.log(`░██████╗████████╗░█████╗░██████╗░░█████╗░░██████╗░███████╗  ░█████╗░██╗░░░██╗████████╗░█████╗░  ████████╗██╗░░██╗`);
        console.log(`██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝░██╔════╝  ██╔══██╗██║░░░██║╚══██╔══╝██╔══██╗  ╚══██╔══╝╚██╗██╔╝`);
        console.log(`╚█████╗░░░░██║░░░██║░░██║██████╔╝███████║██║░░██╗░█████╗░░  ███████║██║░░░██║░░░██║░░░██║░░██║  ░░░██║░░░░╚███╔╝░`);
        console.log(`░╚═══██╗░░░██║░░░██║░░██║██╔══██╗██╔══██║██║░░╚██╗██╔══╝░░  ██╔══██║██║░░░██║░░░██║░░░██║░░██║  ░░░██║░░░░██╔██╗░`);
        console.log(`██████╔╝░░░██║░░░╚█████╔╝██║░░██║██║░░██║╚██████╔╝███████╗  ██║░░██║╚██████╔╝░░░██║░░░╚█████╔╝  ░░░██║░░░██╔╝╚██╗`);
        console.log(`╚═════╝░░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝╚═╝░░╚═╝░╚═════╝░╚══════╝  ╚═╝░░╚═╝░╚═════╝░░░░╚═╝░░░░╚════╝░  ░░░╚═╝░░░╚═╝░░╚═╝`);
        console.log(`\nby Kazmight`);
        console.log(`${colors.reset}\n`);
    }
};

// --- Configuration ---
const CHAIN_ID = 16601;
const RPC_URL = 'https://evmrpc-testnet.0g.ai'; // Ensure this is correct for 0G AI testnet
const CONTRACT_ADDRESS = '0xbD75117F80b4E22698D0Cd7612d92BDb8eaff628'; // Replace if interacting with a different contract
const METHOD_ID = '0xef3e12dc'; // Method ID for the contract interaction
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';

// Image sources for data to upload
const IMAGE_SOURCES = [
    { url: 'https://picsum.photos/800/600', responseType: 'arraybuffer' },
    { url: 'https://loremflickr.com/800/600', responseType: 'arraybuffer' }
];

let privateKeys = [];
let currentKeyIndex = 0;

// Ethers.js version compatibility (for ethers v5 vs v6)
const isEthersV6 = ethers.version.startsWith('6');
const parseUnits = isEthersV6 ? ethers.parseUnits : ethers.utils.parseUnits;
const parseEther = isEthersV6 ? ethers.parseEther : ethers.utils.parseEther;
const formatEther = isEthersV6 ? ethers.formatEther : ethers.utils.formatEther;

const provider = isEthersV6
    ? new ethers.JsonRpcProvider(RPC_URL)
    : new ethers.providers.JsonRpcProvider(RPC_URL);

// --- Wallet and Key Management ---
function loadPrivateKeys() {
    try {
        let index = 1;
        let key = process.env[`PRIVATE_KEY_${index}`];

        // Handle single PRIVATE_KEY for backward compatibility
        if (!key && index === 1 && process.env.PRIVATE_KEY) {
            key = process.env.PRIVATE_KEY;
        }

        while (key) {
            if (isValidPrivateKey(key)) {
                privateKeys.push(key);
            } else {
                logger.error(`Invalid private key at PRIVATE_KEY_${index}`);
            }
            index++;
            key = process.env[`PRIVATE_KEY_${index}`];
        }

        if (privateKeys.length === 0) {
            logger.critical('No valid private keys found in .env file. Please set PRIVATE_KEY_1, PRIVATE_KEY_2, etc., or just PRIVATE_KEY.');
            process.exit(1);
        }

        logger.success(`Loaded ${privateKeys.length} private key(s)`);
    } catch (error) {
        logger.critical(`Failed to load private keys: ${error.message}`);
        process.exit(1);
    }
}

function isValidPrivateKey(key) {
    key = key.trim();
    if (!key.startsWith('0x')) key = '0x' + key;
    try {
        // A valid private key is 32 bytes (64 hex characters) + '0x'
        const bytes = Buffer.from(key.replace('0x', ''), 'hex');
        return key.length === 66 && bytes.length === 32;
    } catch (error) {
        return false;
    }
}

function getNextPrivateKey() {
    return privateKeys[currentKeyIndex];
}

// Function to rotate private key (not strictly needed for this script's loop, but good to have)
function rotatePrivateKey() {
    currentKeyIndex = (currentKeyIndex + 1) % privateKeys.length;
    return privateKeys[currentKeyIndex];
}

function initializeWallet() {
    const privateKey = getNextPrivateKey();
    return new ethers.Wallet(privateKey, provider);
}

// --- HTTP Client and User Agent ---
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function createAxiosInstance() {
    const config = {
        headers: {
            'User-Agent': getRandomUserAgent(),
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.8',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'sec-gpc': '1',
            'Referer': 'https://storagescan-galileo.0g.ai/',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
    };
    return axios.create(config);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- Network and Data Operations ---
async function checkNetworkSync() {
    try {
        logger.loading('Checking network sync...');
        const blockNumber = await provider.getBlockNumber();
        logger.success(`Network synced at block ${blockNumber}`);
        return true;
    } catch (error) {
        logger.error(`Network sync check failed: ${error.message}`);
        return false;
    }
}

async function fetchRandomImage() {
    try {
        logger.loading('Fetching random image...');
        const axiosInstance = createAxiosInstance();
        const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
        const response = await axiosInstance.get(source.url, {
            responseType: source.responseType,
            maxRedirects: 5
        });
        logger.success('Image fetched successfully');
        return response.data;
    } catch (error) {
        logger.error(`Error fetching image: ${error.message}`);
        throw error;
    }
}

async function checkFileExists(fileHash) {
    try {
        logger.loading(`Checking file hash ${fileHash}...`);
        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(`${INDEXER_URL}/file/info/${fileHash}`);
        return response.data.exists || false;
    } catch (error) {
        logger.warn(`Failed to check file hash: ${error.message}`);
        return false;
    }
}

async function prepareImageData(imageBuffer) {
    const MAX_HASH_ATTEMPTS = 5;
    let attempt = 1;

    while (attempt <= MAX_HASH_ATTEMPTS) {
        try {
            const salt = crypto.randomBytes(16).toString('hex');
            const timestamp = Date.now().toString();
            const hashInput = Buffer.concat([
                Buffer.from(imageBuffer),
                Buffer.from(salt),
                Buffer.from(timestamp)
            ]);
            const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
            const fileExists = await checkFileExists(hash);
            if (fileExists) {
                logger.warn(`Hash ${hash} already exists, retrying with new salt/timestamp...`);
                attempt++;
                continue;
            }
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            logger.success(`Generated unique file hash: ${hash}`);
            return {
                root: hash,
                data: imageBase64
            };
        } catch (error) {
            logger.error(`Error generating unique hash (attempt ${attempt}): ${error.message}`);
            attempt++;
            if (attempt > MAX_HASH_ATTEMPTS) {
                throw new Error(`Failed to generate unique hash after ${MAX_HASH_ATTEMPTS} attempts`);
            }
        }
    }
}

async function uploadToStorage(imageData, wallet, walletIndex) {
    const MAX_RETRIES = 3;
    const TIMEOUT_SECONDS = 10; // 5 minutes
    const FIXED_GAS_LIMIT = 500000n; // 
    let attempt = 1; // Correctly initialized here

    logger.loading(`Checking wallet balance for ${wallet.address}...`);
    const balance = await provider.getBalance(wallet.address);
    const minBalance = parseEther('0.0015'); // Minimum balance to ensure transaction goes through
    if (BigInt(balance) < BigInt(minBalance)) {
        throw new Error(`Insufficient balance: ${formatEther(balance)} OG. Minimum required: ${formatEther(minBalance)} OG.`);
    }
    logger.success(`Wallet balance: ${formatEther(balance)} OG`);

    while (attempt <= MAX_RETRIES) {
        try {
            logger.loading(`Uploading file for wallet #${walletIndex + 1} [${wallet.address}] (Attempt ${attempt}/${MAX_RETRIES})...`);
            const axiosInstance = createAxiosInstance();
            await axiosInstance.post(`${INDEXER_URL}/file/segment`, {
                root: imageData.root,
                index: 0,
                data: imageData.data,
                proof: {
                    siblings: [imageData.root],
                    path: []
                }
            }, {
                headers: {
                    'content-type': 'application/json'
                }
            });
            logger.success('File segment uploaded');

            // Data for the smart contract interaction
            const contentHash = crypto.randomBytes(32); // A random 32-byte hash
            const data = ethers.concat([
                Buffer.from(METHOD_ID.slice(2), 'hex'),
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000020', 'hex'),
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000014', 'hex'),
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000060', 'hex'),
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000080', 'hex'),
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex'),
                contentHash,
                Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
            ]);

            const value = parseEther('0.000839233398436224'); // Value to send with the transaction

            // --- Fixed Gas Price & Gas Limit (mimicking TradeGPT) ---
            // No explicit gasPrice or EIP-1559 fields are set here,
            // ethers.js will use the provider's default gas price.
            logger.info(`Using fixed gas limit: ${FIXED_GAS_LIMIT}`);
            logger.info('Relying on RPC provider for gas price (no dynamic fetching).');

            // --- Balance Check ---
            // For true mimicry, we assume the wallet has sufficient funds to cover
            // the fixed gas limit at the network's default gas price.
            // Removing the provider.getGasPrice() call from here.
            const requiredBalance = FIXED_GAS_LIMIT + BigInt(value); // Only checks for value + minimum for gasLimit itself

            if (BigInt(balance) < requiredBalance) {
                throw new Error(`Insufficient balance: ${formatEther(balance)} OG. Required (min): ${formatEther(requiredBalance)} OG.`);
            }

            logger.loading('Sending transaction...');
            // Get the current nonce for the wallet
            const nonce = await provider.getTransactionCount(wallet.address, 'latest');
            
            // Build the transaction parameters with fixed gas limit
            const txParams = {
                to: CONTRACT_ADDRESS,
                data,
                value,
                nonce,
                chainId: CHAIN_ID,
                gasLimit: FIXED_GAS_LIMIT,
                // No gasPrice, maxFeePerGas, or maxPriorityFeePerGas explicitly set here
                // This makes it behave like the TradeGPT script's swap transaction
            };

            const tx = await wallet.sendTransaction(txParams);
            const txLink = `${EXPLORER_URL}${tx.hash}`;
            logger.info(`Transaction sent: ${tx.hash}`);
            logger.info(`Explorer: ${txLink}`);

            logger.loading(`Waiting for confirmation (${TIMEOUT_SECONDS}s)...`);
            let receipt;
            try {
                // Wait for the transaction to be confirmed, with a timeout
                receipt = await Promise.race([
                    tx.wait(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_SECONDS} seconds`)), TIMEOUT_SECONDS * 1000))
                ]);
            } catch (error) {
                if (error.message.includes('Timeout')) {
                    logger.warn(`Transaction timeout after ${TIMEOUT_SECONDS}s.`);
                    // Attempt to get the receipt one more time in case it confirmed shortly after timeout
                    receipt = await provider.getTransactionReceipt(tx.hash);
                    if (receipt && receipt.status === 1) {
                        logger.success(`Transaction confirmed late in block ${receipt.blockNumber}`);
                    } else {
                        throw new Error(`Transaction failed or remains pending after timeout: ${txLink}`);
                    }
                } else {
                    throw error;
                }
            }

            if (receipt.status === 1) {
                logger.success(`Transaction confirmed in block ${receipt.blockNumber}`);
                logger.success(`File uploaded, root hash: ${imageData.root}`);
                return receipt;
            } else {
                throw new Error(`Transaction failed: ${txLink}. Status: ${receipt.status}`);
            }
        } catch (error) {
            logger.error(`Upload attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                const delay = 10 + Math.random() * 20; // Random delay between 10-30 seconds
                logger.warn(`Retrying after ${delay.toFixed(2)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
                attempt++;
                continue;
            }
            throw error; // If max retries reached, throw the error
        }
    }
}

// --- Main Execution Flow ---
async function main() {
    try {
        logger.banner();
        loadPrivateKeys();

        logger.loading('Checking network status...');
        const network = await provider.getNetwork();
        // Ensure chainId is a BigInt for comparison if using ethers v6
        const networkChainId = network.chainId; 

        if (BigInt(networkChainId) !== BigInt(CHAIN_ID)) {
            throw new Error(`Invalid chainId: expected ${CHAIN_ID}, got ${networkChainId}`);
        }
        logger.success(`Connected to network: chainId ${networkChainId} (${network.name})`);

        const isNetworkSynced = await checkNetworkSync();
        if (!isNetworkSynced) {
            throw new Error('Network is not synced. Please check RPC connection.');
        }

        console.log(colors.cyan + "Available wallets:" + colors.reset);
        for (let i = 0; i < privateKeys.length; i++) {
            const wallet = new ethers.Wallet(privateKeys[i]);
            console.log(`${colors.green}[${i + 1}]${colors.reset} ${wallet.address}`);
        }
        console.log();

        rl.question('How many files to upload per wallet? ', async (count) => {
            count = parseInt(count);
            if (isNaN(count) || count <= 0) {
                logger.error('Invalid number. Please enter a number greater than 0.');
                rl.close();
                process.exit(1);
                return;
            }

            const totalUploads = count * privateKeys.length;
            logger.info(`Starting ${totalUploads} uploads (${count} per wallet)`);

            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            let successful = 0;
            let failed = 0;

            for (let walletIndex = 0; walletIndex < privateKeys.length; walletIndex++) {
                currentKeyIndex = walletIndex; // Set the current key index for initializeWallet
                const wallet = initializeWallet();
                logger.section(`Processing Wallet #${walletIndex + 1} [${wallet.address}]`);

                for (let i = 1; i <= count; i++) {
                    const uploadNumber = (walletIndex * count) + i;
                    logger.process(`Upload ${uploadNumber}/${totalUploads} (Wallet #${walletIndex + 1}, File #${i})`);

                    try {
                        const imageBuffer = await fetchRandomImage();
                        const imageData = await prepareImageData(imageBuffer);
                        await uploadToStorage(imageData, wallet, walletIndex);
                        successful++;
                        logger.success(`Upload ${uploadNumber} completed successfully.`);

                        // Delay between individual uploads for the same wallet
                        if (i < count) { // Not the last upload for this wallet
                            logger.loading('Waiting for next upload for this wallet...');
                            await delay(3000); // 3 seconds delay
                        }
                    } catch (error) {
                        failed++;
                        logger.error(`Upload ${uploadNumber} failed: ${error.message}`);
                        await delay(5000); // Longer delay on failure
                    }
                }

                // Delay before switching to the next wallet
                if (walletIndex < privateKeys.length - 1) { // Not the last wallet
                    logger.loading('Switching to next wallet in 10 seconds...');
                    await delay(10000); // 10 seconds delay between wallets
                }
            }

            logger.section('Upload Summary');
            logger.summary(`Total wallets processed: ${privateKeys.length}`);
            logger.summary(`Uploads attempted per wallet: ${count}`);
            logger.summary(`Total uploads attempted: ${totalUploads}`);
            if (successful > 0) logger.success(`Successful uploads: ${successful}`);
            if (failed > 0) logger.error(`Failed uploads: ${failed}`);
            logger.success('All operations completed.');

            rl.close();
            process.exit(0);
        });

        rl.on('close', () => {
            logger.bye('Process selesai ~ Jangan Lupa Di follow github nya dan kasih stars ya bang.');
        });

    } catch (error) {
        logger.critical(`Main process error: ${error.message}`);
        rl.close();
        process.exit(1);
    }
}

main();
