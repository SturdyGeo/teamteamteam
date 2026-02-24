#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return "";
  }

  return process.argv[index + 1] ?? "";
}

function requireArg(flag) {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

const version = requireArg("--version");
const repository = requireArg("--repository");
const arm64Sha = requireArg("--arm64-sha");
const amd64Sha = requireArg("--amd64-sha");
const outputPath = requireArg("--output");

const formula = `class Ttteam < Formula
  desc "Terminal-first, multi-user kanban CLI"
  homepage "https://github.com/${repository}"
  version "${version}"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/${repository}/releases/download/v#{version}/ttteam-darwin-arm64.tar.gz"
      sha256 "${arm64Sha}"
    else
      url "https://github.com/${repository}/releases/download/v#{version}/ttteam-darwin-amd64.tar.gz"
      sha256 "${amd64Sha}"
    end
  end

  def install
    bin.install "ttteam"
  end

  test do
    system "#{bin}/ttteam", "--version"
  end
end
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, formula, "utf8");
