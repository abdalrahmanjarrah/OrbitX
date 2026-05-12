const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = "  const [messages, setMessages] = useState<Message[]>([]);\n  const [newMessage, setNewMessage] = useState('');";
const replacement1 = `  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingMap, setTypingMap] = useState<Record<string, {name: string, time: number}>>({});
  const lastTypingUpdate = useRef(0);
  const lastMsgTime = useRef(0);`;

code = code.replace(target1, replacement1);

const target2 = "    return () => unsubscribe();\n  }, [user.uid]);";
const replacement2 = `    return () => unsubscribe();
  }, [user.uid]);

  // Typing status effect
  useEffect(() => {
    const unsubTyping = onSnapshot(collection(db, 'chat_typing'), snap => {
      const newMap = {};
      snap.docs.forEach(d => {
        if (d.id !== user.uid) newMap[d.id] = d.data();
      });
      setTypingMap(newMap);
    }, () => {});
    
    // Force re-render to update typing status timeout visually
    const interval = setInterval(() => setTypingMap(m => ({...m})), 2000);
    return () => { unsubTyping(); clearInterval(interval); };
  }, [user.uid]);
  
  const typingNames = Object.values(typingMap).filter(t => Date.now() - t.time < 4000).map(t => t.name);`;

code = code.replace(target2, replacement2);

const target3 = "  const handleSendMessage = async () => {\n    if (!newMessage.trim()) return;\n    if (newMessage.length > 500) {\n      alert('الرسالة طويلة جداً! الحد الأقصى هو 500 حرف.');\n      return;\n    }";
const replacement3 = `  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (newMessage.length > 500) {
      alert('الرسالة طويلة جداً! الحد الأقصى هو 500 حرف.');
      return;
    }
    const now = Date.now();
    if (now - lastMsgTime.current < 2000) {
      alert('يرجى الانتظار قليلاً قبل إرسال رسالة أخرى (Anti-Spam).');
      return;
    }
    lastMsgTime.current = now;`;

code = code.replace(target3, replacement3);

const target4 = "      <div className=\"flex-1 p-6 overflow-y-auto space-y-6\">";
const replacement4 = `      <div className="flex-1 p-6 overflow-y-auto space-y-6 relative">
        {typingNames.length > 0 && (
          <div className="sticky top-0 z-10 text-xs text-indigo-400 italic mb-2 animate-pulse text-right bg-[#0a0b16]/80 p-2 rounded-lg backdrop-blur-sm self-start inline-block">
            {typingNames.join(' و ')} {typingNames.length > 1 ? 'يكتبون الآن...' : 'يكتب الآن...'}
          </div>
        )}`;

code = code.replace(target4, replacement4);

const target5 = /<input\s+type="text"\s+value=\{newMessage\}\s+onChange=\{\(e\) => setNewMessage\(e\.target\.value\)\}/m;
const replacement5 = `<input 
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              const now = Date.now();
              if (now - lastTypingUpdate.current > 3000) {
                lastTypingUpdate.current = now;
                setDoc(doc(db, 'chat_typing', user.uid), { name: user.displayName, time: now }).catch(() => {});
              }
            }}`;

code = code.replace(target5, replacement5);

fs.writeFileSync('src/App.tsx', code);
