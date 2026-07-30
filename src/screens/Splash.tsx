import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNav } from "../nav";
import { useT } from "../i18n";

export default function Splash() {
  const { reset } = useNav();
  const t = useT();
  useEffect(() => {
    const t = setTimeout(() => reset("onboarding"), 2200);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <motion.div
      style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
      exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div style={{ display: "grid", placeItems: "center", gap: 28 }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="ember-orb" style={{ width: 20, height: 20 }}
        />
        <motion.div
          initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          style={{ textAlign: "center" }}
        >
          <div className="wordmark" style={{ fontSize: 52, letterSpacing: "-0.03em" }}>Aura</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 15 }}>{t("Your avatar, alive.")}</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
