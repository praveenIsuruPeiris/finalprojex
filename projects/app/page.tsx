import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-grow">
        <div className="text-center py-10">
          <h1 className="text-4xl font-bold">Welcome to Projex</h1>
          <p className="text-gray-600 mt-4">Manage your projects efficiently!</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
