# Disperse Token Gasless Dapp

The Dapp uses gasless transactions, to make the user's Web3 journey easier:

- gasless ERC20 token allowance by using the user's [EIP712](https://eips.ethereum.org/EIPS/eip-712) signature. The transaction is sent by a private wallet in the backend.
- gassless ERC20 batch transfers to different receivers (with amounts) by using an [EIP2771](https://eips.ethereum.org/EIPS/eip-2771) contract. The transaction is sent by a [Biconomy Relayer](https://docs.biconomy.io/products/enable-gasless-transactions/choose-an-approach-to-enable-gasless)

## Resources

- Dapp
  - [Loom Video Demo](https://www.loom.com/share/1ebcd0bb2c5648ed9c0b360f9d3e4975)
  - [Live Deployment](https://gasless-disperse-tokens.vercel.app/)
    - may not be available in the future
    - may not have enough GoerliETH for gasless transactions
- Contracts (Goerli)
  - [Disperse](https://goerli.etherscan.io/address/0xD152f549545093347A162Dce210e7293f1452150)
  - [Disperse Gasless](https://goerli.etherscan.io/address/0x8b5c68c1fab75e67e4fcad4a15ddc2d7ea5963c3)
  - [ERC20Permit Token 18 decimals](https://goerli.etherscan.io/address/0x30e803c8f44bcdb4306ec12364c01977ed403295)
  - [ERC20Permit Token 6 decimals](https://goerli.etherscan.io/address/0x6b43483125a56848efe7636d1202214b28786246)

## The Dapp allows to:

- connect MetaMask wallet
- view connected account address and ETH balance
- add ERC20 token address and view balance
- mint 100,000 tokens for an address
  - token contract needs to expose 'function mint(address to, uint256 amount) external'
  - functionality added in order to simplify testing
  - not gasless
- approve token balance to the:
  - disperseGasless contract if gasless checked, token needs to inherit ERC20Permit
  - disperse contract if gasless unchecked
- add receivers with amounts
- verify if receivers addresses are valid and if there are enough tokens to send
- distribute tokens gasless (or not) only if enough allowance

## How to run the Dapp

- `git clone https://github.com/alexsserban/gasless-disperse-token-dapp.git`
- `cd gasless-disperse-token-dapp/dapp`
- `yarn`
- `cp .env.example .env`
  - NEXT_PUBLIC_INFURA_KEY -> [Infura](https://infura.io/) key used for the Web3 API
  - NEXT_PUBLIC_NETWORK -> goerli
  - NEXT_PUBLIC_BLOCK_NATIVE_KEY -> [Web3-Onboard](https://docs.blocknative.com/onboard) key for the MetaMask connection
  - NEXT_PUBLIC_BICONOMY_KEY -> [Biconomy](https://docs.biconomy.io/guides/biconomy-dashboard) key for sending gasless Disperse transactions
  - NEXT_PUBLIC_DISPERSE_ADDRESS -> Disperse contract address
  - NEXT_PUBLIC_DISPERSE_GASLESS_ADDRESS -> Disperse Gasless contract address
  - DEPLOYER_PRIVATE_KEY -> Wallet private key for sending allowance transactions, not exposed in the browser
- `yarn run dev`

## How to manage contracts

- `git clone https://github.com/alexsserban/gasless-disperse-token-dapp.git`
- `cd gasless-disperse-token-dapp/contracts`
- `yarn`
- `hh clean`
- `hh compile`
- `cp .env.example .env`
  - INFURA_API_KEY -> [Infura](https://infura.io/) key used for the Web3 API
  - DEPLOYER_PRIVATE_KEY -> Wallet private key for deploying contracts
  - ETHERSCAN_API_KEY -> [Etherscan](https://etherscan.io/) key used to verify contracts source
  - BICONOMY_TRUSTED_FORWARDER -> [Biconomy Trusted Forwarder](https://docs.biconomy.io/misc/contract-addresses) address for deploying the DisperseGasless contract
- Deployments
  - ERC20Permit token contract - `hh run --network goerli ./scripts/deploy-token.ts`
  - DisperseGasless contract - `hh run --network goerli ./scripts/deploy.ts`
- Contracts artifacts and typechains need to be updated in the frontend after contract changes
  - `yarn update-dapp`
