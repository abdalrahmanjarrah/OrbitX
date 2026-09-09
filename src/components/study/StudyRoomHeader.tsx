import React from "react";
import { LogOut, Rocket, Trash2, Zap } from "lucide-react";
import { cn } from "../../lib/utils";
import { Room } from "../../shared";

export interface StudyRoomHeaderProps {
  room: Room;
  isJoined: boolean;
  isHost: boolean;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  setShowDeleteDialog: (val: boolean) => void;
  setShowExitDialog: (val: boolean) => void;
  handleConfirmExit: () => void;
  isExiting: boolean;
}

function StudyRoomHeaderComponent({
  room,
  isJoined,
  isHost,
  isFocusMode,
  setIsFocusMode,
  setShowDeleteDialog,
  setShowExitDialog,
  handleConfirmExit,
  isExiting,
}: StudyRoomHeaderProps) {
  return (
    <nav className="z-20 mx-auto mt-6 max-w-[95%] lg:max-w-7xl flex items-center justify-between px-6 py-3 bg-space-dark/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-indigo-900/40">
      {/* Right Side: Station Info */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="p-2.5 bg-gradient-to-br from-indigo-400/20 to-indigo-500/20 rounded-full border border-indigo-400/30 text-indigo-500">
            <Rocket size={20} />
          </div>
          {isJoined && (
            <div
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0b16] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"
              title="متصل بالمدار"
            />
          )}
        </div>
        <div className="text-right">
          <h2 className="text-lg md:text-xl font-black text-white">
            {room.name}
          </h2>
          <p className="text-[10px] text-gray-500 font-bold tracking-wider">
            {room.participants.length}/{room.maxParticipants} رواد فضاء
          </p>
        </div>
      </div>

      {/* Left Side: Actions */}
      <div className="flex items-center gap-4 md:gap-6">
        {/* Utility Actions */}
        <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2">
          {isHost && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-xl"
              title="حذف المحطة"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={cn(
              "p-2 rounded-xl transition-all flex items-center gap-2 group",
              isFocusMode
                ? "bg-indigo-500 text-white"
                : "text-gray-500 hover:text-white hover:bg-white/5",
            )}
            title={
              isFocusMode ? "إيقاف وضع التركيز" : "تفعيل وضع التركيز العميق"
            }
          >
            <span className="text-xs font-bold hidden sm:block">
              {isFocusMode ? "خروج من التركيز" : "تركيز عميق"}
            </span>
            <Zap className={cn("w-5 h-5", isFocusMode && "animate-pulse")} />
          </button>

          <button
            onClick={() => {
              setShowExitDialog(true);
            }}
            disabled={isExiting}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="خروج"
          >
            <span className="text-xs font-bold hidden sm:block">خروج</span>
            <LogOut className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default React.memo(StudyRoomHeaderComponent);
