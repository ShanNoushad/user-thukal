"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const empty={fullName:"",phone:"",house:"",street:"",landmark:"",city:"",district:"",state:"Kerala",pinCode:""};
const fields=[["fullName","Full name"],["phone","Phone number"],["house","House name / building"],["street","Street / locality"],["landmark","Landmark (optional)"],["city","City"],["district","District"],["state","State"],["pinCode","PIN code"]];

export default function AddressForm({user,initialAddress,onSaved}) {
  const [form,setForm]=useState({...empty,...(initialAddress||{})});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e){
    e.preventDefault();setError("");
    if(!/^[0-9]{6}$/.test(form.pinCode))return setError("Enter a valid 6-digit PIN code.");
    if(!/^[0-9+\-\s]{10,15}$/.test(form.phone))return setError("Enter a valid phone number.");
    setBusy(true);
    try{
      await setDoc(doc(db,"users",user.uid),{uid:user.uid,address:form,updatedAt:serverTimestamp()},{merge:true});
      onSaved(form);
    }catch(err){setError(err.message || "Could not save address.");}
    finally{setBusy(false);}
  }
  return <form className="form-card form-stack address-form" onSubmit={submit}>
    {fields.map(([key,label])=><label key={key}>{label}{key==="district" ? <input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required /> : <input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required={key!=="landmark"} />}</label>)}
    {error&&<p className="error">{error}</p>}<button className="button" disabled={busy}>{busy?"Saving address…":"Save address"}</button>
  </form>;
}
