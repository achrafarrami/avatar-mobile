import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNav } from "../nav";

export default function Splash() {
  const { reset } = useNav();
  useEffect(() => {
    const t = setTimeout(() => reset("onboarding"), 2200);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <motion.div
      style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
      exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.5 }}
    >
      <div style={{ display: "grid", placeItems: "center", gap: 22 }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.94, 1.04, 0.94], opacity: 1 }}
          transition={{ scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.8 } }}
          style={{ width: 132, height: 132, borderRadius: "50%", background: "var(--grad)", boxShadow: "var(--glow)" }}
        />
        <motion.div
          initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          style={{ textAlign: "center" }}
        >
          <div className="display grad-text" style={{ fontSize: 44 }}>Aura</div>
          <div className="muted" style={{ marginTop: 4, letterSpacing: "0.16em", fontSize: 13, textTransform: "uppercase" }}>
            Your AI Avatar
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
