export type RootStackParamList = {
  Tabs: undefined;
  ActionModal: undefined;
  RecordSale: undefined;
  AddExpense: undefined;
  ProductUpsert: { productId?: string };
  VariantsEditor: { productId: string };
  SalesHistory: undefined;
  ExpensesHistory: undefined;
  ExpenseEdit: { expenseId: string };
  SaleEdit: { saleId: string };
};
