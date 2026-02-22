// app/fields/layout.tsx

import Header from "@/components/layouts/header";

export default function FieldsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<div className="flex flex-1">
				{/* <Sidebar /> если sidebar слева */}

				<main className="flex-1 p-6 md:p-8">{children}</main>
			</div>
			{/* <Footer /> если нужен */}
		</div>
	);
}
