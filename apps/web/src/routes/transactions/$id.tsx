import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransaction } from "@/hooks/useTransaction";
import { TransactionWitnessList } from "@/components/transactions/TransactionWitnessList";
import { AddWitnessDialog } from "@/components/transactions/AddWitnessDialog";
import { HistoryViewer } from "@/components/history/HistoryViewer";
import { ArrowLeft, Calendar, FileText, Package, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/transactions/$id")({
	component: TransactionDetailPage,
	beforeLoad: authGuard,
});

function TransactionDetailPage() {
	const { id } = Route.useParams();
	const [isAddWitnessOpen, setIsAddWitnessOpen] = useState(false);
	const { transaction, loading, error } = useTransaction(id);

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
			</div>
		);
	}

	if (error || !transaction) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-4">
				<h2 className="text-xl font-bold text-red-600">
					Error loading transaction
				</h2>
				<p className="text-neutral-600">
					{error?.message || "Transaction not found"}
				</p>
				<Button asChild className="mt-4" variant="outline">
					<Link to="/">Go Home</Link>
				</Button>
			</div>
		);
	}

	const { transaction: currentTransaction } = { transaction: transaction! };

	return (
		<div className="container mx-auto max-w-3xl p-4 py-8">
			<div className="mb-6">
				<Link
					to="/"
					className="mb-4 inline-flex items-center text-sm text-neutral-500 hover:text-emerald-600 transition-colors"
				>
					<ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
				</Link>

				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
							{currentTransaction.type === "GIVEN"
								? "Given to"
								: currentTransaction.type === "RECEIVED"
									? "Received from"
									: "Collected from"}{" "}
							{currentTransaction.contact.name}
						</h1>
						<p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
							<Calendar size={14} />
							{format(
								new Date(currentTransaction.date as string),
								"MMMM d, yyyy",
							)}
						</p>
					</div>
					<div className="text-right">
						{currentTransaction.amount && (
							<div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
								{new Intl.NumberFormat("en-US", {
									style: "currency",
									currency: "SAR",
								}).format(currentTransaction.amount)}
							</div>
						)}
						{currentTransaction.quantity && (
							<div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
								{currentTransaction.quantity} x{" "}
								{currentTransaction.itemName || "Item"}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="grid gap-6">
				{/* Transaction Details Card */}
				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
						<FileText size={20} className="text-emerald-600" />
						Details
					</h3>

					<div className="space-y-4">
						{currentTransaction.description && (
							<div>
								<span className="block text-sm font-medium text-neutral-500">
									Description
								</span>
								<p className="mt-1 text-neutral-900 dark:text-neutral-100">
									{currentTransaction.description}
								</p>
							</div>
						)}

						{currentTransaction.itemName && (
							<div>
								<span className="block text-sm font-medium text-neutral-500">
									Item
								</span>
								<div className="mt-1 flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
									<Package size={16} className="text-neutral-400" />
									{currentTransaction.itemName}
									{currentTransaction.quantity && (
										<span className="text-neutral-500">
											x{currentTransaction.quantity}
										</span>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Witnesses Section */}
				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<UserPlus size={20} className="text-emerald-600" />
							Witnesses
						</h3>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsAddWitnessOpen(true)}
						>
							Add Witness
						</Button>
					</div>
					<TransactionWitnessList
						witnesses={
							currentTransaction.witnesses.filter(
								(w): w is NonNullable<typeof w> => w !== null,
							) as any
						}
					/>
				</div>

				<AddWitnessDialog
					isOpen={isAddWitnessOpen}
					onClose={() => setIsAddWitnessOpen(false)}
					transactionId={id}
				/>

				{/* History Section */}
				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<HistoryViewer
						history={
							currentTransaction.history.filter(
								(h): h is NonNullable<typeof h> => h !== null,
							) as any
						}
					/>
				</div>
			</div>
		</div>
	);
}
