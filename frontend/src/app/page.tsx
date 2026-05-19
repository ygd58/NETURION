'use client';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.replace('/app.html');
  }, []);
  return (
    <div style={{background:'#060a14',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#5dd9ec',fontFamily:'monospace'}}>
      Loading NETURION...
    </div>
  );
}
