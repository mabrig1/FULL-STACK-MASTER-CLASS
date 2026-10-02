"use client";

import { motion } from "motion/react";
import {
  Bot,
  CheckCircle2,
  Code2,
  GitBranch,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const signals = [
  { icon: Code2, label: "Code lab", value: "running" },
  { icon: Bot, label: "Mentor swarm", value: "5 agents" },
  { icon: GitBranch, label: "Project proof", value: "verified" },
];

export default function HomeShowcase() {
  return (
    <motion.div
      className="showcaseShell"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="showcaseGlow" />
      <div className="showcaseTopbar">
        <div className="showcaseDots"><span /><span /><span /></div>
        <span className="showcaseStatus"><i /> academy live</span>
      </div>

      <motion.div
        className="showcaseCommand"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
      >
        <div className="showcaseIcon"><Sparkles size={18} /></div>
        <div>
          <small>AI ORCHESTRATOR</small>
          <strong>Build a production SaaS with auth, payments and AI.</strong>
        </div>
      </motion.div>

      <div className="showcaseSignals">
        {signals.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 + index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </motion.article>
          );
        })}
      </div>

      <motion.div
        className="showcaseDeploy"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.72 }}
      >
        <div className="deployHeader">
          <span><Rocket size={16} /> Production build</span>
          <strong>READY</strong>
        </div>
        <div className="deployTrack"><motion.i initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ delay: 0.85, duration: 1.1 }} /></div>
        <div className="deployChecks">
          <span><CheckCircle2 size={14} /> tests passed</span>
          <span><ShieldCheck size={14} /> security gate passed</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
