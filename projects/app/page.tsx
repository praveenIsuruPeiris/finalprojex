import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./globals.css";
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="relative flex-grow">
        {/* Background Video */}
        <video 
          className="absolute inset-0 w-full h-full object-cover" 
          autoPlay 
          loop 
          muted
          title="AI-generated video of Gordon Murray, Ron Dennis, Mansour Ojjeh, and Creighton Brown sitting around a table in a café in Milan, discussing the first sketch of the McLaren F1."
  aria-label="AI-generated video of Gordon Murray, Ron Dennis, Mansour Ojjeh, and Creighton Brown sitting around a table in a café in Milan, discussing the first sketch of the McLaren F1."
        >
          <source src="/home.mp4" type="video/mp4"/>
          Your browser does not support the video tag.
        </video>

        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>

        {/* Centered Text Content */}
        <div className="relative flex flex-col items-center justify-center h-full text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold">Welcome to Projex</h1>
          <p className="typing-effect mt-4">Create wonders</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
