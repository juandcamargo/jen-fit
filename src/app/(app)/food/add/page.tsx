import { Suspense } from "react";
import { AddFoodClient } from "./AddFoodClient";

export default function AddFoodPage() {
  return (
    <Suspense fallback={null}>
      <AddFoodClient />
    </Suspense>
  );
}
