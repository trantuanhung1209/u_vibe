"use client";
import { ProjectForm } from "@/modules/home/components/project-form";
import Image from "next/image"

const Home = () => {

  return (
    <>
      <div className="flex flex-col max-w-5xl mx-auto w-full">
      <section className="space-y-6 py-[16vh] 2xl:py-40">
        <div className="flex flex-col items-center">
          <Image
            src="/cloud_vibe.png"
            alt="Vibe"
            width={100}
            height={100}
            className="hidden md:block"
          />
        </div>
        <h1 className="text-2xl md:text-5xl font-bold text-center">
          Build something with Uside vibe
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground text-center">
          Create apps and websites by chatting with AI
        </p>
        <div className="max-w-3xl mx-auto w-full">
          <ProjectForm />
        </div>
      </section>
    </div>
    </>
  );
};

export default Home;
