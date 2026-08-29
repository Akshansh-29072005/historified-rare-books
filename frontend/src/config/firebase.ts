import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDbb1anHP4MdrVxduqqhvgpKjhg1ql1M84',
  authDomain: 'historified-rare-books.firebaseapp.com',
  projectId: 'historified-rare-books',
  storageBucket: 'historified-rare-books.firebasestorage.app',
  messagingSenderId: '940530617921',
  appId: '1:940530617921:web:53fe89c418e9a4565e00c0',
  measurementId: "G-F1T1R1H7YQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
