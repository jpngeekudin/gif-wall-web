import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import idl from './idl.json';
import kp from './keypair.json';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

// Constants
const TWITTER_HANDLE = 'piramore';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
  'https://media4.giphy.com/media/ensLRi1D2wRXMR4Gnr/giphy.gif?cid=ecf05e47tgxhdeybmzeh1613ba8dje0b87bs6tsj75jhso46&rid=giphy.gif&ct=g'
];

const { SystemProgram, Keypair } = web3;

// keypair for holding gif data
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);

// program id from idl
const programID = new PublicKey(idl.metadata.address);

// use devnet network
const network = clusterApiUrl('devnet');

// opts for provider
const opts = { preflightCommitment: 'processed' };

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) console.log('Phantom wallet found!');
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log('Connected with public key: ', response.publicKey.toString());
        setWalletAddress(response.publicKey.toString());
      }
      
      else {
        alert('Solana object not found! Go get phantom wallet ehhe.');
      }
    }
    
    catch(err) {
      console.log(err);
    }
  }

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with public key: ', response.publicKey.toString());
      setWalletAddress(solana.publicKey.toString());
    }
  }

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });

      console.log('Created base account with address', baseAccount.publicKey.toString());
      await getGifList();
    }

    catch(err) {
      console.log('error creating gif account', err);
    }
  }

  const renderNotConnectedContainer = () => (
    <button className='cta-button connect-wallet-button' onClick={connectWallet}>
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (!gifList) return (
      <div className="connected-container">
        <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )

    else return (
      <div className="connected-container">
        <form onSubmit={(event) => {
          event.preventDefault();
          sendGif();
        }}>
          <input type="text" placeholder="Enter gif link!" value={inputValue} onChange={onInputChange} />
          <button type="submit" className="cta-button submit-gif-button">Submit</button>
        </form>
        <div className="gif-grid">
          {gifList.map((item, index) => (
            <div className="gif-item" key={index}>
              <img src={item.gifLink} alt={item.gifLink} />
            </div>
          ))}
        </div>
      </div>
    )
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link giver!');
      return;
    }

    console.log('Gif link:', inputValue);

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey
        }
      });

      console.log('Gif link successfully sent to program with link:', inputValue);
      setInputValue('');
      await getGifList();
    }

    catch(err) {
      console.log('error saving gif list:', err);
    }

    if (inputValue.length > 0) {
      console.log('GIF link: ', inputValue);
      setGifList([...gifList, inputValue]);
      setInputValue('');
    }
    else console.log('Empty input, try again.');
  }

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log('Got the account');
      setGifList(account.gifList);
    }

    catch(err) {
      console.log('Error in getGitfList: ', err);
      setGifList(null);
    }
  }

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    }

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('fetching gif list...');
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
