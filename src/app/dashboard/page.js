// import Chart from "../components/Chart";
import SignalBox from "../components/SignalBox";

export default function Dashboard() {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* <Chart /> */}
      <SignalBox />
    </div>
  );
}
