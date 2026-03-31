import { Question } from '../types';

export const examQuestions: Question[] = [
  {
    id: "Q001",
    type: "multiple",
    question: "You have a Fabric notebook that reads data into a Spark DataFrame. You need to evaluate the data to calculate the min, max, mean, and standard deviation for all string and numeric columns. Which of the following approaches will meet this requirement? (Select all that apply)",
    topic: "PySpark Data Analysis",
    category: "Fabric",
    scenarioId: "scn-pyspark-analysis",
    explanation: `df.explain() only prints the execution plan (logical/physical) of the DataFrame. It does NOT calculate or return statistics. To get min/max/mean/stddev, you must use aggregation functions from PySpark:

1. CORRECT: df.describe().show() - Built-in method that returns count, mean, stddev, min, max for numeric columns. Works well for quick inspection.

2. CORRECT: df.agg(F.min(), F.max(), F.mean(), F.stddev()) - Manual aggregation expressions allow precise control and works for both numeric and string types (though mean/stddev only apply to numeric).

3. WRONG: df.explain() - This is only for query plan diagnostics, not statistics calculation.

For strings, you can calculate min/max (lexicographic), but mean/stddev are not applicable. Handle this with type detection and conditional aggregations.`,
    options: [
      {
        id: "opt-1",
        text: "df.explain()",
      },
      {
        id: "opt-2",
        text: "df.describe().show()",
      },
      {
        id: "opt-3",
        text: "df.agg(F.min(), F.max(), F.mean(), F.stddev()) with type detection",
      },
      {
        id: "opt-4",
        text: "df.printSchema()",
      },
      {
        id: "opt-5",
        text: "df.sample(0.1).describe()",
      },
    ],
    correctAnswer: ["opt-2", "opt-3"],
  },
  {
    id: "Q002",
    type: "single",
    question: "In the context of analyzing a Spark DataFrame to get min, max, mean, and standard deviation, which method prints the query execution plan but does NOT calculate statistics?",
    topic: "PySpark Data Analysis",
    category: "Fabric",
    explanation: "df.explain() is a diagnostic tool that shows Spark's logical and physical execution plans. It helps debug query optimization but does not perform any aggregation or statistics calculations.",
    options: [
      {
        id: "opt-1",
        text: "df.describe()",
      },
      {
        id: "opt-2",
        text: "df.explain()",
      },
      {
        id: "opt-3",
        text: "df.agg()",
      },
      {
        id: "opt-4",
        text: "df.statistics()",
      },
    ],
    correctAnswer: "opt-2",
  },
  {
    id: "Q003",
    type: "dragdrop",
    question: "Match each PySpark function to its primary purpose when analyzing a DataFrame",
    topic: "PySpark Data Analysis",
    category: "Fabric",
    explanation: "df.describe() is for quick statistical summaries, df.explain() is for query plan diagnostics, and df.agg() is for custom aggregations on specific columns.",
    dragDropItems: [
      { id: "item-1", text: "df.describe()", correctBucket: "bucket-1" },
      { id: "item-2", text: "df.explain()", correctBucket: "bucket-2" },
      { id: "item-3", text: "df.agg(F.min(), F.max())", correctBucket: "bucket-3" },
    ],
    dragDropBuckets: [
      { id: "bucket-1", label: "Quick statistical summary (count, mean, stddev, min, max)" },
      { id: "bucket-2", label: "Query plan diagnostics" },
      { id: "bucket-3", label: "Custom aggregation on specific columns" },
    ],
  },
];
