import { Navbar } from "@/modules/home/components/navbar";
import { StarryBackground } from "@/components/starry-background";

interface Props {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    return (
        <>
            <main className="flex flex-col min-h-screen max-h-screen">
                <Navbar />
                <StarryBackground />
                <div className="flex-1 flex flex-col px-4 pb-4">
                    {children}
                </div>
            </main>
        </>
    )
};

export default Layout;