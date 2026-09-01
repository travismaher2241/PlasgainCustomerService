import React from "react";
import { PlanTakeoffWorkspace } from "./PlanTakeoffWorkspace";

// This hub used to host six tabs: Take-off plus five engineering calculators
// (Cable Cover, Pole Spacing, Foundations/wind loading, Solar Sizing, Spec
// Review). The calculators did structural/compliance engineering work — wind
// region footing sizing, AS/NZS 1158 spacing math, even margin/cost-price
// data — none of which matches a sales rep's actual job of matching a spec
// already on a plan to a Plasgain product. Take-off is the one tool that does
// that job, so it's what's left here.
export const ToolsHub: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      <PlanTakeoffWorkspace />
    </div>
  );
};
