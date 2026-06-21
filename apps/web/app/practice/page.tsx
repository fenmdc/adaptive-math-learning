import PracticeClient from "./PracticeClient";

type PracticePageSearchParams = Record<string, string | string[] | undefined>;

export default async function PracticePage({
  searchParams
}: {
  searchParams?: PracticePageSearchParams | Promise<PracticePageSearchParams>;
}) {
  const queryString = toQueryString((await searchParams) ?? {});

  return <PracticeClient initialQueryString={queryString} key={queryString} />;
}

function toQueryString(searchParams: PracticePageSearchParams) {
  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
      return;
    }

    if (value !== undefined) query.set(key, value);
  });

  return query.toString();
}
