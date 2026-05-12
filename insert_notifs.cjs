const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = code.split('\n');
const insertIndex = lines.findIndex(l => l.includes('function Dashboard({ user'));

const dropDownCode = `
function NotificationsDropdown({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'notifications'), orderBy('timestamp', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const unreadCount = notifs.filter(n => !n.read).length;
      if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
         playSound('notification');
      }
      prevUnreadCountRef.current = unreadCount;
      setNotifications(notifs);
    });
    return () => unsub();
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) updateDoc(doc(db, 'users', userId, 'notifications', n.id), { read: true });
    });
  };

  return (
    <div className="relative">
      <button 
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }} 
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unreadCount}</span>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-2 w-72 bg-[#0b0c16] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
            dir="rtl"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-bold text-sm">الإشعارات</span>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">لا توجد إشعارات</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={\`p-3 border-b border-white/5 text-sm \${n.read ? 'opacity-70' : 'bg-white/5'}\`}>
                    {n.content}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

if (!code.includes('function NotificationsDropdown')) {
  lines.splice(insertIndex, 0, dropDownCode);
}   
fs.writeFileSync('src/App.tsx', lines.join('\n'));
