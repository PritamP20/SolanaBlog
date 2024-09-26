import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as anchor from "@project-serum/anchor"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {getRandomName} from "src/functions/getRandomName";
import { getAvatarUrl } from "src/functions/getAvatarUrl";
import idl from "src/idl.json"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { async } from "rxjs";


const BlogContext = createContext();

//get program key
const PROGRAM_KEY = new PublicKey(idl.metadata.address)

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error("Parent must be wrapped inside PostsProvider");
  }

  return context;
};

export const BlogProvider = ({ children }) => {

  const [user, setUser] = useState()
  const [initialized, setInitialiazed] = useState(false)
  const [transactionPending, setTransactionPending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [lastPostId, setLastPostId] = useState(0)
  const [posts, setPosts] = useState([])

  const anchorWallet = useAnchorWallet();
  const {connection} = useConnection()
  const {publicKey} = useWallet()

  const program = useMemo(()=>{
    if(anchorWallet){
      const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor, anchor.AnchorProvider.defaultOptions)
      return new anchor.Program(idl, PROGRAM_KEY, provider)
    }
  }, [connection, anchorWallet])

  useEffect(()=>{
    const start = async()=>{
      if(program && publicKey){
        try {
          const [userPda] = await findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
          console.log(userPda.toString())
          const user = await program.account.userAccount.fetch(userPda);
          if(user){
            console.log("setting initialized")
            setInitialiazed(true)
            setUser(user)
            setLastPostId(user.lastPostId);
          }

          const postAccounts = await program.account.postAccount.all()
          setPosts(postAccounts)
          console.log(postAccounts)
        } catch (error) {
          console.log("No user "+error)
          setInitialiazed(false)
        }
      }
    }
    start()
  },[program, publicKey, transactionPending])

  const initUser = async () => {
    if (program && publicKey) {
      try {
        setTransactionPending(true);
        
        const name = getRandomName();
        const avatar = getAvatarUrl(name);
  
        const [userPda] = await findProgramAddressSync(
          [utf8.encode('user'), publicKey.toBuffer()], 
          program.programId
        );
  
        const tx = new Transaction();
        
        const { blockhash } = await program.provider.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
  
        const instruction = await program.methods.initUser(name, avatar).accounts({
          userAccount: userPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        }).instruction();
        console.log("User PDA:", userPda.toString());
        console.log("Name:", name);
        console.log("Avatar URL:", avatar);

  
        tx.add(instruction);
  
        const signedTx = await program.provider.wallet.signTransaction(tx);
        const txId = await program.provider.connection.sendRawTransaction(signedTx.serialize());
  
        await program.provider.connection.confirmTransaction(txId);
  
        setInitialiazed(true);
        console.log("Transaction successful:", txId);
  
      } catch (error) {
        console.error("Error initializing user:", error);
        if (error.message.includes('failed to get recent blockhash')) {
          console.error("Failed to get recent blockhash. Make sure you're using the correct RPC method or endpoint.");
        }
      } finally {
        setTransactionPending(false);
      }
    } else {
      console.error("Program or publicKey is undefined.");
    }
  }

  const createPost = async (title, content) => {
    if (program && publicKey) {
      setTransactionPending(true);
      try {
        const [userPda] = await findProgramAddressSync(
          [utf8.encode('user'), publicKey.toBuffer()], 
          program.programId
        );
  
        const [postPda] = await findProgramAddressSync(
          [utf8.encode('post'), publicKey.toBuffer(), Uint8Array.from([lastPostId])], 
          program.programId
        );
  
        console.log("User PDA:", userPda.toString());
        console.log("Post PDA:", postPda.toString());
  
        const tx = new Transaction();
        const { blockhash } = await program.provider.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
  
        const instruction = await program.methods
          .createPost(title, content) // 'titile' corrected to 'title'
          .accounts({
            postAccount: postPda,
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          }).instruction();
  
        tx.add(instruction);
  
        // Simulate transaction before sending
        const simulationResult = await program.provider.connection.simulateTransaction(tx);
        console.log("Simulation Result:", simulationResult);
  
        const signedTx = await program.provider.wallet.signTransaction(tx);
        const txId = await program.provider.connection.sendRawTransaction(signedTx.serialize());
  
        console.log('Post created:', txId);
  
        setShowModal(false);
      } catch (error) {
        console.error("Error creating post:", error);
        if (error.logs) {
          console.error("Transaction logs:", error.logs);
        }
      } finally {
        setTransactionPending(false);
      }
    }
  };

  return (
    <BlogContext.Provider
      value={{
        user,
        initialized,
        initUser,
        showModal,
        setShowModal,
        createPost,
        posts
      }}
    >
      {children}
    </BlogContext.Provider>
  );
};
