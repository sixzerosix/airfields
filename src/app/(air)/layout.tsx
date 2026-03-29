import { LogOutButton } from "@/components/auth/logout-button";

export default function FieldsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex flex-col">
			<header className="py-5 px-10 bg-white">
				<div className="flex h-full w-full items-center justify-between">
					<a href="/" className="font-medium">
						AIR
					</a>
					<div className="">
						<LogOutButton />
					</div>
				</div>
			</header>
			<div className="flex flex-1">
				{/* <Sidebar /> если sidebar слева */}

				<main className="flex-1 p-6 md:p-8">{children}</main>
			</div>
			{/* <Footer /> если нужен */}
		</div>
	);
}
