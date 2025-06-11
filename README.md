# 0G Storage Scan Bot


**0G Storage Scan Bot** is an automated tool designed to interact with the 0G Storage blockchain network. It automates the process of uploading random images to the 0G Storage network using multiple wallet accounts and manages transactions on the blockchain.

## Don't forget join telegram channel Dasar Pemulung for Password.
## Links telegram: https://t.me/dasarpemulung

## ✨ Features

- ✅ Support for multiple wallet private keys
- ✅ Random image fetching from online sources
- ✅ File hash generation with uniqueness verification
- ✅ Automatic transaction handling
- ✅ Error management with retry mechanism
- ✅ Detailed colored console logging
- ✅ Multi-wallet processing

## 📋 Requirements

- Javascript
- An internet connection
- Valid 0G Storage wallet private keys

## 🚀 Installation


1. **Clone or download this repository**:
   ```
   git clone https://github.com/kazmight/Storage-Auto-TX.git
   cd Storage-Auto-TX
   ```

2. **Install dependencies**:
   ```
   npm install
   ```


3. **Run the bot**:
   ```bash
   node storage.js
   ```


## ⚙️ Configuration

1. **in the project root directory with your private keys `.env`**
   ```
   # For a single wallet
   PRIVATE_KEY=your_private_key_here

   # OR for multiple wallets
   PRIVATE_KEY_1=your_first_private_key
   PRIVATE_KEY_2=your_second_private_key
   PRIVATE_KEY_3=your_third_private_key
   ```

3. **Follow the on-screen prompts**:
   - The bot will display available wallets
   - Enter the number of files to upload per wallet when prompted
   - The bot will handle the rest automatically

4. **Monitor the process**:
   - The console will display colorful logs showing progress
   - Each wallet will be processed sequentially
   - A summary will be shown at the end

## 🔍 Troubleshooting

- **Insufficient Balance Error**: Ensure your wallets have sufficient OG tokens for transactions (minimum 0.0015 OG)
- **Network Connection Issues**: Check your internet connection or try using proxies
- **Transaction Failures**: The bot will automatically retry failed transactions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

