const $ = (id) => document.getElementById(id);
const STORE = "grekexo_chats_v1";
let apiKey = ""; // Intentionally session-only; never persist the secret.
let currentChatId = null;
let chats = [];
let busy = false;
let recognition = null;
let listening = false;

const systemPrompt = () => {
  const style = $("languageSelect").value;
  const lang = style === "hinglish" ? "Reply naturally in Hindi-English Hinglish."
    : style === "english" ? "Reply in clear English."
    : style === "hindi" ? "Reply in natural Hindi."
    : "Match the language and style used by the user.";
  return `You are Grekexo AI, a warm, thoughtful, capable all-round assistant with a strong focus on education. ${lang}
PERSONALITY: Speak naturally and kindly, like a helpful human conversation partner, without pretending to be human or claiming real feelings. Notice emotional cues, respond with empathy, and avoid judging. Ask a brief clarifying question when genuinely needed. Do not overdo emojis.
STUDY MODE: Explain concepts step-by-step at the learner's level; use examples, summaries, tables, practice questions, and exam-ready notes when useful. For Indian Class 11/12 PCB learners, use NCERT-aligned terminology when relevant and distinguish facts from uncertainty.
ALL-ROUND HELP: Help with science, maths, writing, technology, agriculture/gardening, editing workflows, creativity, planning, and everyday decisions. Give practical, safe advice. For waste, explain wet/dry/e-waste separation and local rules; compost suitable organic waste when practical. For agriculture, ask location/crop/soil/season when needed and avoid pretending one treatment suits every farm. For health, legal, financial, or pesticide questions, be careful and recommend qualified/local expert advice when stakes are high.
TRUTHFULNESS: Never claim to have done an action you did not do, access private data, browse live information, or remember a past chat unless it is in the supplied conversation. State uncertainty honestly. Do not invent sources. Protect the user's privacy and API credentials.`;
};

function loadChats() {
  try { chats = JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { chats = []; }
  if (!Array.isArray(chats)) chats = [];
  renderHistory();
}
function persistChats() {
  try { localStorage.setItem(STORE, JSON.stringify(chats)); } catch { toast("Chat history could not be saved on this device."); }
  renderHistory();
}
function newChat() {
  currentChatId = "c_" + Date.now();
  chats.unshift({id:currentChatId,title:"New chat",messages:[],updated:Date.now()});
  $("chatArea").innerHTML = "";
  $("welcome").classList.remove("hidden");
  $("headerChatTitle").textContent = "Grekexo AI";
  persistChats();
  if (window.innerWidth <= 760) $("sidebar").classList.remove("open");
}
function getCurrentChat() {
  let c = chats.find(x => x.id === currentChatId);
  if (!c) { newChat(); c = chats.find(x => x.id === currentChatId); }
  return c;
}
function renderHistory() {
  const list = $("historyList"); list.innerHTML = "";
  chats.slice().sort((a,b)=>(b.updated||0)-(a.updated||0)).forEach(c => {
    const b = document.createElement("button");
    b.className = "history-item" + (c.id === currentChatId ? " active" : "");
    b.textContent = c.title || "New chat"; b.title = b.textContent;
    b.onclick = () => openChat(c.id); list.appendChild(b);
  });
}
function openChat(id) {
  const c = chats.find(x=>x.id===id); if (!c) return;
  currentChatId = id; $("chatArea").innerHTML = "";
  $("welcome").classList.toggle("hidden", c.messages.length > 0);
  $("headerChatTitle").textContent = c.title || "Grekexo AI";
  c.messages.forEach(m => addMessage(m.role,m.content,false));
  renderHistory();
  if (window.innerWidth <= 760) $("sidebar").classList.remove("open");
}
function addMessage(role, content, save=true) {
  $("welcome").classList.add("hidden");
  const wrap = document.createElement("article"); wrap.className = "message " + (role === "user" ? "user" : "assistant");
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = role === "user" ? "You" : "✦";
  const body = document.createElement("div"); body.className = "message-body";
  const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = content;
  body.appendChild(bubble);
  if (role !== "user") {
    const actions = document.createElement("div"); actions.className = "message-actions";
    const copy = document.createElement("button"); copy.className = "mini-action"; copy.textContent = "Copy";
    copy.onclick = async () => { try { await navigator.clipboard.writeText(content); toast("Copied."); } catch { toast("Copy isn't available in this browser."); } };
    const speak = document.createElement("button"); speak.className = "mini-action"; speak.textContent = "▶ Read aloud";
    speak.onclick = () => speakText(content);
    actions.append(copy,speak); body.appendChild(actions);
  }
  wrap.append(avatar,body); $("chatArea").appendChild(wrap);
  if (save) {
    const c = getCurrentChat(); c.messages.push({role,content}); c.updated = Date.now();
    if (role === "user" && (c.title === "New chat" || !c.title)) c.title = content.slice(0,38) + (content.length>38?"…":"");
    $("headerChatTitle").textContent = c.title || "Grekexo AI";
    persistChats();
  }
  $("chatArea").scrollTop = $("chatArea").scrollHeight;
  window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
}
function showTyping() {
  const el=document.createElement("article"); el.className="message assistant"; el.id="typingIndicator";
  el.innerHTML='<div class="avatar">✦</div><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>';
  $("chatArea").appendChild(el); el.scrollIntoView({block:"end",behavior:"smooth"});
}
function toast(msg) { const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove("show"),2800); }
function friendlyApiError(status, raw) {
  let detail = "";
  try { detail = JSON.parse(raw)?.error?.message || ""; } catch {}
  if (status===401) return "Authentication failed. Check your API key in Settings. If you shared it publicly, revoke it and create a new one.";
  if (status===403) return "Access denied. Check your OpenAI project permissions, model access, and account status.";
  if (status===429) return "Rate limit or quota reached. Check your OpenAI usage limits and billing. A free ChatGPT account does not automatically include API credit.";
  if (status===400) return "The API rejected the request. Check the selected model and request details." + (detail ? "\nDetails: "+detail : "");
  if (!status) return "Network error. Check your internet connection and try again.";
  return `API error (${status}). ${detail || "Please check your OpenAI platform settings and try again."}`;
}
async function sendMessage(text) {
  text = (text || $("messageInput").value).trim();
  if (!text || busy) return;
  if (!apiKey) { openSettings(); $("settingsStatus").textContent="Add your API key to start chatting."; return; }
  $("messageInput").value=""; autoResize();
  addMessage("user",text,true);
  const c=getCurrentChat();
  busy=true; $("sendBtn").disabled=true; showTyping();
  try {
    const history = c.messages.slice(-20).map(m=>({role:m.role,content:m.content}));
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},
      body:JSON.stringify({model:$("modelSelect").value,temperature:0.7,max_tokens:1200,messages:[{role:"system",content:systemPrompt()},...history]})
    });
    const raw=await response.text();
    if (!response.ok) throw new Error(friendlyApiError(response.status,raw));
    const data=JSON.parse(raw);
    const answer=data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("The model returned an empty reply. Please try again.");
    $("typingIndicator")?.remove();
    addMessage("assistant",answer,true);
    if ($("speakToggle").checked) speakText(answer);
  } catch(e) {
    $("typingIndicator")?.remove();
    addMessage("assistant","I couldn't complete that request.\n\n"+(e.message || "Please check your internet connection and API settings."),true);
  } finally { busy=false; $("sendBtn").disabled=false; $("messageInput").focus(); }
}
function openSettings() {
  $("apiKeyInput").value="";
  $("settingsStatus").textContent=apiKey ? "A key is active for this tab. Enter a new one only if you want to replace it." : "";
  $("settingsModal").hidden=false;
}
function closeSettings() { $("settingsModal").hidden=true; }
function autoResize() { const t=$("messageInput"); t.style.height="auto"; t.style.height=Math.min(t.scrollHeight,160)+"px"; }
function speakText(text) {
  if (!("speechSynthesis" in window)) { toast("Read-aloud is not supported by this browser."); return; }
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=1.02; speechSynthesis.speak(u);
}
function toggleVoice() {
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if (!SR) { toast("Voice input isn't supported here. Try Chrome and allow microphone access."); return; }
  if (listening && recognition) { recognition.stop(); return; }
  recognition=new SR(); recognition.lang=$("languageSelect").value==="hindi"?"hi-IN":"en-IN"; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.onstart=()=>{listening=true;$("voiceBtn").classList.add("listening");toast("Listening… speak now.");};
  recognition.onend=()=>{listening=false;$("voiceBtn").classList.remove("listening");};
  recognition.onerror=(e)=>toast(e.error==="not-allowed"?"Allow microphone permission to use voice.":"Voice input error: "+e.error);
  recognition.onresult=(e)=>{const said=e.results[0][0].transcript;$("messageInput").value=($("messageInput").value+" "+said).trim();autoResize();$("messageInput").focus();};
  try { recognition.start(); } catch { toast("Voice input is already starting."); }
}
function setTheme(light) { document.body.classList.toggle("light",light); localStorage.setItem("grekexo_theme",light?"light":"dark"); }
$("sendBtn").onclick=()=>sendMessage();
$("messageInput").addEventListener("input",autoResize);
$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
$("newChatBtn").onclick=newChat;
$("settingsBtn").onclick=openSettings; $("topSettingsBtn").onclick=openSettings;
$("closeSettings").onclick=closeSettings;
$("settingsModal").addEventListener("click",e=>{if(e.target===$("settingsModal"))closeSettings();});
$("saveSettingsBtn").onclick=()=>{
  const k=$("apiKeyInput").value.trim();
  if(k) apiKey=k;
  localStorage.setItem("grekexo_model",$("modelSelect").value);
  localStorage.setItem("grekexo_language",$("languageSelect").value);
  localStorage.setItem("grekexo_speak",$("speakToggle").checked?"1":"0");
  $("settingsStatus").textContent=apiKey?"Settings saved for this tab.":"No key entered; add one before sending a message.";
  if(apiKey) toast("Ready when you are.");
  setTimeout(closeSettings,apiKey?650:1400);
};
$("forgetKeyBtn").onclick=()=>{apiKey="";$("apiKeyInput").value="";$("settingsStatus").textContent="Key forgotten for this tab.";toast("API key forgotten.");};
$("themeBtn").onclick=()=>setTheme(!document.body.classList.contains("light"));
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("voiceBtn").onclick=toggleVoice;
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>{ $("messageInput").value=b.dataset.prompt; autoResize(); sendMessage(b.dataset.prompt); });
try {
  $("modelSelect").value=localStorage.getItem("grekexo_model")||"gpt-4o-mini";
  $("languageSelect").value=localStorage.getItem("grekexo_language")||"auto";
  $("speakToggle").checked=localStorage.getItem("grekexo_speak")==="1";
  setTheme(localStorage.getItem("grekexo_theme")==="light");
} catch {}
loadChats();
if(chats.length){currentChatId=chats[0].id;openChat(currentChatId);} else newChat();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
