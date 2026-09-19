import { useContext } from "react";
import { SystemStatusContext } from "../context/systemStatus";

export default function useSystemStatus() {
  return useContext(SystemStatusContext);
}
