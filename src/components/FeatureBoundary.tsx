// FeatureBoundary.tsx — حاجز أمان لكل قسم (فيتشر) على حدة
//
// بدل أن يسقط الموقع كاملاً عندما ينهار قسم واحد (مثلاً: الأساطيل يعلق
// والمستخدم يضطر يحدّث الصفحة كلها)، كل قسم يلُف بحاجز خاص. إذا تعطّل القسم
// يُعرض مكانه بطاقة "حدث خطأ في هذا القسم" بسيطة مع زر إعادة التحميل،
// ويُدخل الخطأ بشكل تلقائي في فلتر الأخطاء (errorQueue) ليراجعه الأدمن.
//
// الصرامة: الحاجز نفسه غير قابل للانهيار — أي خطأ داخلي يُبتلع.

import { Component, type ReactNode } from "react";
import { enqueueError } from "../lib/errorQueue";

interface FeatureBoundaryProps {
  name: string;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showReload?: boolean;
}

interface FeatureBoundaryState {
  hasError: boolean;
}

export default class FeatureBoundary extends Component<FeatureBoundaryProps, FeatureBoundaryState> {
  state: FeatureBoundaryState = { hasError: false };

  static getDerivedStateFromError(): FeatureBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // حسب مبدأ "الفِلتر": لا نرمي الخطأ في وجه المستخدم، بل نبتلعه وندخله للفلتر.
    enqueueError(`feature-boundary:${this.props.name}`, error, {
      componentStack: errorInfo?.componentStack,
    });

    // لا نُرجع الخطأ لأعلى حتى لا يسقط الـ ErrorBoundary الرئيسي — القسم فقط يُعزل.
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.fallbackTitle ?? "حدث خطأ في هذا القسم";
    const message =
      this.props.fallbackMessage ??
      "تم عزل المشكلة وإبلاغ الإدارة تلقائياً. جرّب إعادة تحميل هذا القسم.";

    return (
      <div className="w-full min-h-[300px] flex items-center justify-center p-6">
        <div
          className="max-w-sm w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1a1208]/90 to-[#0a0b16]/90 backdrop-blur-xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          role="alert"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <span className="text-amber-400 text-2xl leading-none">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">{message}</p>
          {this.props.showReload !== false && (
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-300 text-sm font-bold hover:from-amber-500/30 hover:to-amber-600/30 transition-all"
            >
              إعادة محاولة هذا القسم
            </button>
          )}
        </div>
      </div>
    );
  }
}