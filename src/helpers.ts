/* eslint-disable camelcase */

interface From {
  first_name?: string;
  last_name?: string;
  username?: string;
}

export function getFullName(from: From): string {
  const { first_name, last_name, username } = from;
  const firstName = first_name || "";
  const lastName = last_name || "";
  const nickname = `(@${username})` || "";
  return firstName + lastName + nickname;
}
