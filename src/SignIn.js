import React from 'react';
import { useAuth } from './AuthContext';
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from './firebase-config';

function SignIn() {
  const { currentUser } = useAuth();

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then((result) => {
      // Handle successful sign-in.
      console.log(result.user);
    }).catch((error) => {
      // Handle errors here.
      console.error(error);
    });
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      // Sign-out successful.
      console.log("Sign out successful");
    }).catch((error) => {
      // An error happened.
      console.error("Sign out error", error);
    });
  };

  return (
    <div>
      {currentUser ? (
        <>
          <p>Logged In</p>
          <button onClick={handleSignOut}>Log Out</button>
        </>
      ) : (
        <button onClick={signInWithGoogle}>Sign in with Google</button>
      )}
    </div>
  );
}

export default SignIn;
