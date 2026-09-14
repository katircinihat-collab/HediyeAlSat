import { orderTimeline } from "../utils/orderLifecycle";
import "../styles/components/order-timeline.css";

export default function OrderTimeline({ order }) {
  return <ol className="order-timeline" aria-label="Sipariş aşamaları">
    {orderTimeline(order).map((step) => <li key={step.label} className={`${step.complete ? "complete" : ""} ${step.current ? "current" : ""}`}>
      <i aria-hidden="true" />
      <span>{step.label}</span>
    </li>)}
  </ol>;
}
